// lib/wasm-java-runner.ts
// Browser-side Java 21 (WASM, OpenJDK Zero via JavaBox) exercise runner.
//
// - Boots the JVM lazily on first use, inside a dedicated Worker.
// - Reuses the warm CompileServer across runs (compile happens per call).
// - On timeout or protocol desync: terminates and cold-boots a new JVM, because
//   an in-VM infinite loop is uninterruptible from JavaScript.
// - No user code leaves the browser.

export type RuntimeStatus = 'cold' | 'booting' | 'ready' | 'running' | 'dead';

export type SourceFile = { name: string; content: string };

export type RunOutcome = {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export type RunnerEvent =
  | { type: 'status'; status: RuntimeStatus; detail?: string }
  | { type: 'stage'; text: string; progress: number };

type Pending = {
  resolve: (r: RunOutcome) => void;
  reject: (e: Error) => void;
  stdout: string[];
  stderr: string[];
  startedAt: number;
  timer: ReturnType<typeof setTimeout>;
};

const WORKER_URL = '/experimental/concurrency-box/worker';

let worker: Worker | null = null;
let status: RuntimeStatus = 'cold';
let readyWaiters: Array<() => void> = [];
let active: Pending | null = null;
let listeners = new Set<(e: RunnerEvent) => void>();
let bootStamp = 0;

function emit(e: RunnerEvent) {
  listeners.forEach((fn) => fn(e));
}

function setStatus(next: RuntimeStatus, detail?: string) {
  status = next;
  emit({ type: 'status', status: next, detail });
}

function flushReady() {
  const w = readyWaiters;
  readyWaiters = [];
  w.forEach((r) => r());
}

function failAll(message: string) {
  if (active) {
    clearTimeout(active.timer);
    active.reject(new Error(message));
    active = null;
  }
  readyWaiters = [];
  setStatus('dead', message);
}

function killWorker() {
  try { worker?.terminate(); } catch { /* ignore */ }
  worker = null;
}

/** Boot (or reuse) the JVM. Resolves once CompileServer answered a ping. */
export function ensureReady(): Promise<void> {
  if (status === 'ready') return Promise.resolve();
  if (status === 'booting') {
    return new Promise((r) => readyWaiters.push(r));
  }

  setStatus('booting');
  bootStamp = Date.now();
  const w = new Worker(`${WORKER_URL}?v=${bootStamp}`, { type: 'module' });
  worker = w;

  w.onmessage = (event) => {
    const m = event.data as { type: string; text?: string; progress?: number; message?: string };
    if (m.type === 'stdout' && typeof m.text === 'string') {
      if (m.text === 'JBOX_PONG' && status === 'booting') {
        setStatus('ready');
        flushReady();
        return;
      }
      // runFiles() 挂了独立 pump 监听，避免重复入队，这里仅做启动期 PONG 检测
    } else if (m.type === 'stderr' && typeof m.text === 'string') {
      // 同上：stderr 由 per-run pump 消费。
    } else if (m.type === 'stage') {
      emit({ type: 'stage', text: m.text ?? '', progress: m.progress ?? 0 });
    } else if (m.type === 'error') {
      failAll(m.message ?? 'JVM 运行时错误');
    } else if (m.type === 'exit' && status === 'running') {
      const err = new Error(`JVM 进程异常退出（code=${m.message ?? '?'}）`);
      if (active) { clearTimeout(active.timer); active.reject(err); active = null; }
      setStatus('dead', err.message);
    }
  };
  w.onerror = (e) => {
    failAll(`JVM Worker 错误：${(e as ErrorEvent).message ?? 'unknown'}`);
  };

  return new Promise((resolve, reject) => {
    const wrapped = () => { resolve(); };
    readyWaiters.push(wrapped);
    const bootTimeout = setTimeout(() => {
      if (status === 'booting') {
        killWorker();
        readyWaiters = readyWaiters.filter((r) => r !== wrapped);
        reject(new Error('JVM 启动超时（首次需下载约 76MB）。请检查网络后重试。'));
      }
    }, 240000);
    // Clear the timeout on success too; keep it cheap.
    readyWaiters.push(() => clearTimeout(bootTimeout));
    try {
      w.postMessage({ type: 'boot' });
    } catch (e) {
      readyWaiters = readyWaiters.filter((r) => r !== wrapped);
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

/** Compile + run multiple sources; main runs on the persistent JVM thread. */
export function runFiles(
  files: SourceFile[],
  mainClass: string,
  timeoutMs = 60000,
): Promise<RunOutcome> {
  if (status !== 'ready') {
    return Promise.reject(new Error('JVM 尚未就绪'));
  }
  if (active) {
    return Promise.reject(new Error('上一次执行仍在进行中'));
  }
  setStatus('running');

  const parts = files
    .map((f, i) => (i === 0 ? '' : `JBOX_FILE ${f.name}\n`) + f.content)
    .join('\n');

  return new Promise((resolve, reject) => {
    const pending: Pending = {
      resolve,
      reject,
      stdout: [],
      stderr: [],
      startedAt: performance.now(),
      timer: setTimeout(() => {
        rebuildAfterFailure();
        reject(new Error('执行超时，JVM 已重建。代码可能有死循环。'));
        active = null;
        setStatus('ready');
      }, timeoutMs),
    };
    active = pending;

    const cleanup = () => {
      clearTimeout(pending.timer);
      setStatus('ready');
      active = null;
    };

    const pump = (event: MessageEvent) => {
      const m = event.data as { type: string; text?: string };
      if (m.type === 'stdout' || m.type === 'stderr') {
        if (typeof m.text === 'string') {
          (m.type === 'stdout' ? pending.stdout : pending.stderr).push(m.text);
          const soFar = pending.stdout.join('\n');
          const mExit = soFar.match(/JBOX_EXIT:(\d+)/);
          if (mExit) {
            worker!.removeEventListener('message', pump);
            const stdout = pending.stdout.filter((l) => !l.startsWith('JBOX_'));
            cleanup();
            resolve({
              exitCode: Number(mExit[1]),
              stdout: stdout.join('\n'),
              stderr: pending.stderr.join('\n'),
              durationMs: performance.now() - pending.startedAt,
            });
          }
        }
      }
    };
    worker!.addEventListener('message', pump);

    try {
      worker!.postMessage({
        type: 'stdin',
        value: `JBOX_COMPILE ${mainClass}\n${parts}\nJBOX_END\n`,
      });
    } catch (e) {
      cleanup();
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

export type JavaDiagnostic = {
  line: number;
  column: number;
  kind: string;      // javac Diagnostic.Kind: ERROR / WARNING ...
  message: string;
};

/** 用与判题同一条通道（runFiles 的已验证路径）做 javac 诊断解析。 */
export function runDiagnostics(
  code: string,
  className: string,
  timeoutMs = 30000,
): Promise<{ ok: boolean; diagnostics: JavaDiagnostic[] }> {
  if (status !== 'ready' || active) {
    return Promise.resolve({ ok: true, diagnostics: [] });
  }
  setStatus('running');

  return new Promise((resolve) => {
    const diags: JavaDiagnostic[] = [];
    const stdoutLines: string[] = [];
    const pending: Pending = {
      resolve: () => {},
      reject: () => {},
      stdout: stdoutLines,
      stderr: [],
      startedAt: performance.now(),
      timer: setTimeout(() => {
        worker?.removeEventListener('message', pump);
        active = null;
        setStatus('ready');
        resolve({ ok: true, diagnostics: diags });
      }, timeoutMs),
    };
    active = pending;

    const pump = (event: MessageEvent) => {
      const m = event.data as { type: string; text?: string };
      if (m.type !== 'stdout' && m.type !== 'stderr') return;
      if (typeof m.text !== 'string') return;
      const t = m.text;
      const match = t.match(/^DIAG (\d+):(\d+) (\w+) (.*)$/);
      if (match) {
        diags.push({ line: Number(match[1]), column: Number(match[2]), kind: match[3], message: match[4] });
      }
      if (t.startsWith('JBOX_EXIT:')) {
        worker!.removeEventListener('message', pump);
        clearTimeout(pending.timer);
        active = null;
        setStatus('ready');
        resolve({ ok: Number(t.slice(10)) === 0, diagnostics: diags });
      }
    };
    worker!.addEventListener('message', pump);
    worker!.postMessage({
      type: 'stdin',
      value: `JBOX_DIAG ${className}\n${code}\nJBOX_END\n`,
    });
  });
}


async function rebuildAfterFailure() {
  killWorker();
  setStatus('cold', '正在重建 JVM…');
  try {
    await ensureReady();
  } catch { /* surface later via ensureReady callers */ }
}

/** Human-readable current status for the UI header. */
export function getStatus(): RuntimeStatus { return status; }

export function onRunnerEvent(fn: (e: RunnerEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
