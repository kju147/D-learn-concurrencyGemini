// JavaBox 浏览器判题 runner（Astro 站点适配版，移植自 lib/wasm-java-runner.ts）
// - JVM 在专用 Worker 内懒启动，持久复用
// - 超时/协议失同步 → 终止并冷启动重建（VM 内死循环无法从 JS 打断）
// - 资产基址可配：开发 http://127.0.0.1:8642/，生产 /javabox/
// - 用户代码不出浏览器

export type RuntimeStatus = 'cold' | 'booting' | 'ready' | 'running' | 'dead';
export type SourceFile = { name: string; content: string };
export type RunOutcome = { exitCode: number; stdout: string; stderr: string; durationMs: number };
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

// 默认走同源 /javabox/（dev 由 vite proxy 代理到 127.0.0.1:8642；生产由 _headers/CDN 决定）。
// 跨源资产会触发 Emscripten 嵌套 Worker 的 origin 限制，不可用——保持同源是硬约束。
const ASSET_BASE =
  (import.meta.env.PUBLIC_JAVABOX_BASE as string | undefined) ?? '/javabox/';
const WORKER_URL = '/concurrency-box-runtime-worker.mjs';

let worker: Worker | null = null;
let status: RuntimeStatus = 'cold';
let readyWaiters: Array<() => void> = [];
let active: Pending | null = null;
let listeners = new Set<(e: RunnerEvent) => void>();
let bootStamp = 0;

function emit(e: RunnerEvent) { listeners.forEach((fn) => fn(e)); }
function setStatus(next: RuntimeStatus, detail?: string) { status = next; emit({ type: 'status', status: next, detail }); }
function flushReady() { const w = readyWaiters; readyWaiters = []; w.forEach((r) => r()); }
function failAll(message: string) {
  if (active) { clearTimeout(active.timer); active.reject(new Error(message)); active = null; }
  readyWaiters = [];
  setStatus('dead', message);
}
function killWorker() { try { worker?.terminate(); } catch { /* ignore */ } worker = null; }

export function ensureReady(): Promise<void> {
  if (status === 'ready') return Promise.resolve();
  if (status === 'booting') return new Promise((r) => readyWaiters.push(r));

  setStatus('booting');
  bootStamp = Date.now();
  const w = new Worker(`${WORKER_URL}?v=${bootStamp}&base=${encodeURIComponent(ASSET_BASE)}`, { type: 'module' });
  worker = w;

  w.onmessage = (event) => {
    const m = event.data as { type: string; text?: string; progress?: number; message?: string };
    if (m.type === 'stdout' && typeof m.text === 'string') {
      if (m.text === 'JBOX_PONG' && status === 'booting') { setStatus('ready'); flushReady(); }
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
  w.onerror = (e) => failAll(`JVM Worker 错误：${(e as ErrorEvent).message ?? 'unknown'}`);

  return new Promise((resolve, reject) => {
    const wrapped = () => resolve();
    readyWaiters.push(wrapped);
    const bootTimeout = setTimeout(() => {
      if (status === 'booting') {
        killWorker();
        readyWaiters = readyWaiters.filter((r) => r !== wrapped);
        reject(new Error('JVM 启动超时（首次需下载约 46MB 数据）。请检查网络后重试。'));
      }
    }, 240000);
    readyWaiters.push(() => clearTimeout(bootTimeout));
    try { w.postMessage({ type: 'boot' }); }
    catch (e) { readyWaiters = readyWaiters.filter((r) => r !== wrapped); reject(e instanceof Error ? e : new Error(String(e))); }
  });
}

export function runFiles(files: SourceFile[], mainClass: string, timeoutMs = 60000): Promise<RunOutcome> {
  if (status !== 'ready') return Promise.reject(new Error('JVM 尚未就绪'));
  if (active) return Promise.reject(new Error('上一次执行仍在进行中'));
  setStatus('running');

  // CompileServer 协议：首个源无名（用 mainClass），后续源以 "JBOX_FILE <裸类名>" 起新文件。
  // 注意必须是裸类名（不带 .java），否则服务端会把点号当包分隔，产出 /Classes/java.java 之类的怪路径。
  const parts = files
    .map((f, i) => (i === 0 ? '' : `JBOX_FILE ${f.name.replace(/\.java$/, '')}\n`) + f.content)
    .join('\n');

  return new Promise((resolve, reject) => {
    const pending: Pending = {
      resolve, reject, stdout: [], stderr: [], startedAt: performance.now(),
      timer: setTimeout(() => {
        rebuildAfterFailure();
        reject(new Error('执行超时，JVM 已重建。代码可能有死循环。'));
        active = null;
        setStatus('ready');
      }, timeoutMs),
    };
    active = pending;

    const cleanup = () => { clearTimeout(pending.timer); setStatus('ready'); active = null; };
    const pump = (event: MessageEvent) => {
      const m = event.data as { type: string; text?: string };
      if ((m.type === 'stdout' || m.type === 'stderr') && typeof m.text === 'string') {
        (m.type === 'stdout' ? pending.stdout : pending.stderr).push(m.text);
        const mExit = pending.stdout.join('\n').match(/JBOX_EXIT:(\d+)/);
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
    };
    worker!.addEventListener('message', pump);

    try {
      worker!.postMessage({ type: 'stdin', value: `JBOX_COMPILE ${mainClass}\n${parts}\nJBOX_END\n` });
    } catch (e) { cleanup(); reject(e instanceof Error ? e : new Error(String(e))); }
  });
}

async function rebuildAfterFailure() {
  killWorker();
  setStatus('cold', '正在重建 JVM…');
  try { await ensureReady(); } catch { /* 由调用方兜底 */ }
}

export type JavaDiagnostic = { line: number; column: number; kind: string; message: string };

/** 用与判题同一条通道做 javac 诊断解析（编辑器红波浪线来源）。JVM 不就绪时静默返回空。 */
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
    const pending: Pending = {
      resolve: () => {}, reject: () => {}, stdout: [], stderr: [],
      startedAt: performance.now(),
      timer: setTimeout(() => {
        worker?.removeEventListener('message', pump);
        active = null; setStatus('ready');
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
      if (match) diags.push({ line: Number(match[1]), column: Number(match[2]), kind: match[3], message: match[4] });
      if (t.startsWith('JBOX_EXIT:')) {
        worker!.removeEventListener('message', pump);
        clearTimeout(pending.timer);
        active = null; setStatus('ready');
        resolve({ ok: Number(t.slice(10)) === 0, diagnostics: diags });
      }
    };
    worker!.addEventListener('message', pump);
    worker!.postMessage({ type: 'stdin', value: `JBOX_DIAG ${className}\n${code}\nJBOX_END\n` });
  });
}

export function getStatus(): RuntimeStatus { return status; }
export function onRunnerEvent(fn: (e: RunnerEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
