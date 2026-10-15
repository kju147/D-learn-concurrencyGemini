const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    "connect-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'self'",
  ].join('; '),
};

const page = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>ConcurrencyBox · 浏览器 Java 21 并发验证</title>
  <style>
    :root {
      color-scheme: light;
      --primary: #355ca8;
      --on-primary: #fff;
      --primary-container: #d9e2ff;
      --surface: #f9f9ff;
      --surface-container: #edf0f8;
      --surface-high: #e5e8f0;
      --outline: #74777f;
      --text: #1a1b20;
      --muted: #44464f;
      --success: #176b43;
      --warning: #8a5100;
      --error: #ba1a1a;
      --radius: 18px;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; color: var(--text); background: var(--surface); }
    button, textarea { font: inherit; }
    .topbar { height: 64px; display: flex; align-items: center; gap: 14px; padding: 0 24px; border-bottom: 1px solid #dfe2ea; background: rgba(249,249,255,.92); }
    .back { color: var(--primary); text-decoration: none; font-weight: 650; }
    .title { font-size: 18px; font-weight: 720; }
    .lab { margin-left: auto; border-radius: 999px; padding: 6px 11px; color: var(--warning); background: #ffddb3; font-size: 13px; font-weight: 700; }
    main { width: min(1440px, 100%); margin: 0 auto; padding: 20px 24px 28px; }
    .intro { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
    .intro-copy { flex: 1; }
    h1 { margin: 0 0 5px; font-size: clamp(24px, 3vw, 34px); letter-spacing: -.035em; }
    .intro p { margin: 0; color: var(--muted); line-height: 1.6; }
    .runtime { display: grid; grid-template-columns: repeat(3, minmax(100px, auto)); gap: 8px; }
    .metric { min-width: 116px; padding: 10px 13px; border-radius: 14px; background: var(--surface-container); }
    .metric span { display: block; color: var(--muted); font-size: 12px; }
    .metric strong { display: block; margin-top: 3px; font-size: 14px; }
    .workspace { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(360px, .75fr); gap: 14px; min-height: calc(100vh - 190px); }
    .panel { min-width: 0; overflow: hidden; border: 1px solid #dfe2ea; border-radius: var(--radius); background: #fff; box-shadow: 0 1px 2px rgba(25,35,55,.05); }
    .panel-head { min-height: 58px; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #e2e5ed; }
    .panel-head strong { font-size: 15px; }
    .spacer { flex: 1; }
    .status { display: inline-flex; align-items: center; gap: 7px; padding: 6px 10px; border-radius: 999px; background: var(--surface-container); color: var(--muted); font-size: 13px; font-weight: 650; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--outline); }
    .status.loading .dot { background: var(--warning); animation: pulse 1.2s ease-in-out infinite; }
    .status.warning .dot { background: var(--warning); }
    .status.ready .dot, .status.success .dot { background: var(--success); }
    .status.error .dot { background: var(--error); }
    button { min-height: 40px; border: 0; border-radius: 999px; padding: 0 17px; cursor: pointer; font-weight: 700; transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
    button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 3px 9px rgba(35,52,91,.18); }
    button:active:not(:disabled) { transform: translateY(0); }
    button:disabled { cursor: not-allowed; opacity: .48; }
    .primary { color: var(--on-primary); background: var(--primary); }
    .secondary { color: var(--primary); background: var(--primary-container); }
    .ghost { color: var(--muted); background: transparent; }
    .editor-wrap { height: calc(100% - 58px); min-height: 500px; background: #15171c; }
    textarea { width: 100%; height: 100%; min-height: 500px; display: block; resize: none; border: 0; outline: 0; padding: 20px 22px; color: #e3e7ef; background: #15171c; font: 14px/1.68 "SFMono-Regular", Consolas, "Liberation Mono", monospace; tab-size: 4; caret-color: #9db7ff; }
    .right { display: grid; grid-template-rows: auto minmax(250px, 1fr) auto; gap: 14px; }
    .boot { padding: 16px; }
    .boot-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .boot h2 { margin: 0; font-size: 16px; }
    .boot p { margin: 5px 0 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
    progress { width: 100%; height: 6px; margin-top: 14px; border: 0; accent-color: var(--primary); }
    .console { display: flex; flex-direction: column; min-height: 260px; }
    pre { flex: 1; margin: 0; overflow: auto; padding: 18px; color: #dce2ef; background: #17191f; white-space: pre-wrap; word-break: break-word; font: 13px/1.65 "SFMono-Regular", Consolas, monospace; }
    .checks { padding: 15px 16px; }
    .checks h2 { margin: 0 0 10px; font-size: 15px; }
    .check { display: flex; align-items: center; gap: 10px; min-height: 34px; color: var(--muted); font-size: 13px; }
    .check i { width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; background: var(--surface-high); font-style: normal; font-weight: 800; }
    .check.pass { color: var(--success); }
    .check.pass i { color: #fff; background: var(--success); }
    .check.fail { color: var(--error); }
    .check.fail i { color: #fff; background: var(--error); }
    .note { margin-top: 10px; padding-top: 10px; border-top: 1px solid #e4e6ed; color: var(--muted); font-size: 12px; line-height: 1.55; }
    @keyframes pulse { 50% { opacity: .3; transform: scale(.8); } }
    @media (max-width: 900px) {
      .intro { align-items: flex-start; flex-direction: column; }
      .runtime { width: 100%; }
      .metric { flex: 1; min-width: 0; }
      .workspace { grid-template-columns: 1fr; }
      .right { grid-template-rows: auto 360px auto; }
      .editor-wrap, textarea { min-height: 420px; }
    }
    @media (max-width: 620px) {
      .topbar, main { padding-left: 14px; padding-right: 14px; }
      .title { font-size: 15px; }
      .runtime { grid-template-columns: 1fr 1fr; }
      .runtime .metric:last-child { grid-column: 1 / -1; }
      .panel-head { flex-wrap: wrap; }
    }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  </style>
</head>
<body>
  <header class="topbar">
    <a class="back" href="/">← 学习系统</a>
    <span class="title">ConcurrencyBox</span>
    <span class="lab">技术验证</span>
  </header>
  <main>
    <section class="intro">
      <div class="intro-copy">
        <h1>浏览器里的真实 OpenJDK 21</h1>
        <p>代码不会上传到执行服务器。本轮继续检查子线程中的 currentThread、监视器与 Runnable 入口。</p>
      </div>
      <div class="runtime" aria-label="运行时信息">
        <div class="metric"><span>运行引擎</span><strong>OpenJDK Zero</strong></div>
        <div class="metric"><span>初次下载</span><strong>约 76 MB</strong></div>
        <div class="metric"><span>执行额度</span><strong>不限次数</strong></div>
      </div>
    </section>

    <section class="workspace">
      <article class="panel">
        <div class="panel-head">
          <strong>Main.java</strong>
          <div class="spacer"></div>
          <button class="ghost" id="reset-source" type="button">恢复代码</button>
          <button class="primary" id="run" type="button" disabled>运行验证</button>
        </div>
        <div class="editor-wrap">
          <textarea id="source" spellcheck="false" aria-label="Java 源代码">public class Main {
    private static volatile int subclassCounter = 0;
    private static volatile int directTaskCounter = 0;
    private static volatile int childTaskCounter = 0;

    private static void reportFailure(Thread thread, Throwable error) {
        System.out.println("UNCAUGHT|" + thread.getName()
                + "|" + error.getClass().getName()
                + "|" + error.getMessage());
        for (StackTraceElement frame : error.getStackTrace()) {
            System.out.println("FRAME|" + frame);
        }
    }

    public static void main(String[] args) throws Exception {
        Thread subclassProbe = new Thread("subclass-probe") {
            @Override
            public void run() {
                System.out.println("ENTER|subclass");
                Thread current = Thread.currentThread();
                System.out.println("CURRENT|subclass|"
                        + (current == null ? "null" : current.getName()));
                System.out.println("MONITOR_BEFORE|subclass");
                synchronized (Main.class) {
                    subclassCounter = 1;
                }
                System.out.println("MONITOR_AFTER|subclass");
                System.out.println("EXIT|subclass");
            }
        };
        subclassProbe.setUncaughtExceptionHandler(Main::reportFailure);
        subclassProbe.start();
        subclassProbe.join();
        System.out.println("JOIN_RETURNED|subclass");
        System.out.println("RESULT|subclass|" + subclassCounter);

        Runnable task = () -> {
            Thread current = Thread.currentThread();
            String currentName = current == null ? "null" : current.getName();
            System.out.println("TASK_ENTER|" + currentName);
            if ("hybrid-probe".equals(currentName)) {
                childTaskCounter++;
            } else {
                directTaskCounter++;
            }
            System.out.println("TASK_EXIT|" + currentName);
        };

        Thread hybridProbe = new Thread(task, "hybrid-probe") {
            @Override
            public void run() {
                Thread current = Thread.currentThread();
                System.out.println("HYBRID_ENTER|"
                        + (current == null ? "null" : current.getName()));
                System.out.println("HOLDER_ACCESS|daemon=" + isDaemon()
                        + "|priority=" + getPriority());
                try {
                    super.run();
                    System.out.println("SUPER_RUN_RETURNED");
                } catch (Throwable error) {
                    reportFailure(this, error);
                }
                System.out.println("HYBRID_EXIT");
            }
        };

        System.out.println("DIRECT_RUN_BEGIN");
        hybridProbe.run();
        System.out.println("DIRECT_RESULT|" + directTaskCounter);

        hybridProbe.start();
        hybridProbe.join();
        System.out.println("JOIN_RETURNED|hybrid");
        System.out.println("CHILD_RESULT|" + childTaskCounter);

        System.out.println("DIAG_DONE");
    }
}</textarea>
        </div>
      </article>

      <aside class="right">
        <section class="panel boot">
          <div class="boot-row">
            <div>
              <h2>Java 运行时</h2>
              <p id="stage">尚未下载。启动后浏览器会缓存运行时。</p>
            </div>
            <button class="secondary" id="boot" type="button">启动 JDK 21</button>
          </div>
          <progress id="progress" max="100" value="0"></progress>
        </section>

        <section class="panel console">
          <div class="panel-head">
            <strong>执行输出</strong>
            <div class="spacer"></div>
            <span class="status" id="status"><span class="dot"></span><span id="status-text">未启动</span></span>
          </div>
          <pre id="output">点击“启动 JDK 21”开始技术验证。</pre>
        </section>

        <section class="panel checks">
          <h2>本轮验收</h2>
          <div class="check" id="check-boot"><i>·</i><span>OpenJDK 21 与 javac 启动</span></div>
          <div class="check" id="check-current"><i>·</i><span>子线程可取得 Thread.currentThread()</span></div>
          <div class="check" id="check-monitor"><i>·</i><span>synchronized 监视器进入并退出</span></div>
          <div class="check" id="check-direct"><i>·</i><span>同一 Thread.run() 在主线程可调用任务</span></div>
          <div class="check" id="check-holder"><i>·</i><span>子线程可访问 Thread holder</span></div>
          <div class="check" id="check-runnable"><i>·</i><span>子线程的 super.run() 可调用任务</span></div>
          <div class="check" id="check-join"><i>·</i><span>join 返回并观察到线程写入</span></div>
          <div class="check" id="check-protocol"><i>·</i><span>执行协议正常结束</span></div>
          <div class="note">这是可行性验证，不用于性能结论。JVM 在独立线程中启动；如果启动过慢，可以取消或重新加载运行时。运行时基于 <a href="https://github.com/bmarti44/javabox" target="_blank" rel="noreferrer">JavaBox</a> 的实验性 OpenJDK 21 WASM 移植。</div>
        </section>
      </aside>
    </section>
  </main>

  <script type="module">
    const source = document.querySelector('#source');
    const bootButton = document.querySelector('#boot');
    const runButton = document.querySelector('#run');
    const resetButton = document.querySelector('#reset-source');
    const output = document.querySelector('#output');
    const progress = document.querySelector('#progress');
    const stage = document.querySelector('#stage');
    const status = document.querySelector('#status');
    const statusText = document.querySelector('#status-text');
    const initialSource = source.value;
    let runtimeWorker = null;
    let bootWatchdog = null;
    let lastBootActivity = 0;
    let recentText = '';
    let bootPhase = 'idle';
    let running = false;

    function setStatus(kind, text) {
      status.className = 'status ' + kind;
      statusText.textContent = text;
    }

    function writeLine(text, isError) {
      recentText = (recentText + text + '\n').slice(-16000);
      if (/^JBOX_(PONG|EXIT:\d+|COMPILE|END|PING|DOOM)/.test(text)) return;
      if (/^={5,}/.test(text)) return;
      if (output.textContent === '等待程序输出…') output.textContent = '';
      output.textContent += (isError ? '[stderr] ' : '') + text + '\n';
      output.scrollTop = output.scrollHeight;
    }

    function setCheck(id, value) {
      const row = document.querySelector(id);
      row.className = 'check ' + (value === true ? 'pass' : value === false ? 'fail' : '');
      row.querySelector('i').textContent = value === true ? '✓' : value === false ? '×' : '·';
    }

    function send(raw) {
      if (!runtimeWorker) throw new Error('JDK 运行时未启动');
      runtimeWorker.postMessage({ type: 'stdin', value: raw });
    }

    function stopWorker() {
      if (bootWatchdog) clearInterval(bootWatchdog);
      bootWatchdog = null;
      if (runtimeWorker) runtimeWorker.terminate();
      runtimeWorker = null;
    }

    function failBoot(message) {
      stopWorker();
      bootPhase = 'error';
      progress.value = 0;
      stage.textContent = '启动失败，请查看输出后重试。';
      bootButton.disabled = false;
      bootButton.textContent = '重新尝试';
      runButton.disabled = true;
      setStatus('error', '启动失败');
      setCheck('#check-boot', false);
      output.textContent += '\n[boot error] ' + message + '\n';
    }

    function waitFor(pattern, timeoutMs) {
      return new Promise((resolve, reject) => {
        const started = Date.now();
        const timer = setInterval(() => {
          const match = recentText.match(pattern);
          if (match) {
            clearInterval(timer);
            resolve(match);
          } else if (Date.now() - started > timeoutMs) {
            clearInterval(timer);
            reject(new Error('等待运行结果超时'));
          }
        }, 100);
      });
    }

    async function boot() {
      if (bootPhase === 'loading') return;
      if (!crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') {
        setStatus('error', '浏览器隔离失败');
        output.textContent = '缺少 SharedArrayBuffer。当前页面没有获得 COOP/COEP 隔离环境。';
        setCheck('#check-boot', false);
        return;
      }

      bootPhase = 'loading';
      bootButton.disabled = false;
      bootButton.textContent = '取消启动';
      output.textContent = '正在下载并启动 OpenJDK 21，首次约 76 MB…\n';
      setStatus('loading', '加载运行时');
      stage.textContent = '加载 JDK 文件系统与 WebAssembly…';
      progress.value = 12;
      lastBootActivity = Date.now();

      try {
        runtimeWorker = new Worker('/experimental/concurrency-box/worker', { type: 'module' });
        runtimeWorker.onmessage = (event) => {
          const message = event.data;
          if (message.type === 'stdout' || message.type === 'stderr') {
            if (bootPhase === 'loading') lastBootActivity = Date.now();
            writeLine(message.text, message.type === 'stderr');
          } else if (message.type === 'stage') {
            lastBootActivity = Date.now();
            stage.textContent = message.text;
            progress.value = Math.max(progress.value, message.progress);
          } else if (message.type === 'ready') {
            if (bootPhase !== 'loading') return;
            if (bootWatchdog) clearInterval(bootWatchdog);
            bootWatchdog = null;
            bootPhase = 'ready';
            progress.value = 100;
            stage.textContent = 'OpenJDK 21 已就绪，可以反复执行。';
            bootButton.textContent = '重新加载运行时';
            runButton.disabled = false;
            setStatus('ready', 'JDK 21 就绪');
            setCheck('#check-boot', true);
            output.textContent += '\n[ConcurrencyBox] JVM 与 javac 已就绪。\n';
          } else if (message.type === 'error') {
            failBoot(message.message);
          } else if (message.type === 'exit' && message.code !== 0) {
            failBoot('JVM 意外退出：' + message.code);
          }
        };
        runtimeWorker.onerror = (event) => {
          event.preventDefault();
          failBoot('JDK Worker 出错：' + event.message);
        };
        runtimeWorker.postMessage({ type: 'boot' });
        bootWatchdog = setInterval(() => {
          if (bootPhase === 'loading' && Date.now() - lastBootActivity > 90000) {
            failBoot('90 秒内没有启动进展。请检查网络或浏览器内存后重试。');
          }
        }, 1000);
      } catch (error) {
        failBoot(error && error.message ? error.message : String(error));
      }
    }

    async function run() {
      if (bootPhase !== 'ready' || running) return;
      running = true;
      runButton.disabled = true;
      bootButton.disabled = true;
      recentText = '';
      output.textContent = '等待程序输出…';
      setStatus('loading', '编译并运行');
      ['#check-current', '#check-monitor', '#check-direct', '#check-holder', '#check-runnable', '#check-join', '#check-protocol'].forEach((id) => setCheck(id, null));

      const classMatch = source.value.match(/public\s+class\s+(\w+)|class\s+(\w+)/);
      const className = classMatch ? (classMatch[1] || classMatch[2]) : 'Main';
      send('JBOX_COMPILE ' + className + '\n' + source.value + '\nJBOX_END\n');

      try {
        const result = await waitFor(/JBOX_EXIT:(\d+)/, 30000);
        const exitCode = Number(result[1]);
        const subclassPass = recentText.includes('ENTER|subclass') && recentText.includes('RESULT|subclass|1');
        const currentPass = recentText.includes('CURRENT|subclass|subclass-probe');
        const monitorPass = recentText.includes('MONITOR_BEFORE|subclass') && recentText.includes('MONITOR_AFTER|subclass');
        const directPass = recentText.includes('TASK_ENTER|main') && recentText.includes('DIRECT_RESULT|1');
        const holderPass = recentText.includes('HYBRID_ENTER|hybrid-probe') && recentText.includes('HOLDER_ACCESS|daemon=');
        const runnablePass = recentText.includes('TASK_ENTER|hybrid-probe') && recentText.includes('CHILD_RESULT|1');
        const joinsReturned = recentText.includes('JOIN_RETURNED|subclass') && recentText.includes('JOIN_RETURNED|hybrid');
        const joinPass = joinsReturned && (subclassPass || runnablePass);
        const protocolPass = exitCode === 0;
        setCheck('#check-current', currentPass);
        setCheck('#check-monitor', monitorPass);
        setCheck('#check-direct', directPass);
        setCheck('#check-holder', holderPass);
        setCheck('#check-runnable', runnablePass);
        setCheck('#check-join', joinPass);
        setCheck('#check-protocol', protocolPass);
        if (subclassPass && currentPass && monitorPass && directPass && holderPass && runnablePass && joinPass && protocolPass) {
          setStatus('success', '并发验证通过');
          output.textContent += '\n[ConcurrencyBox] PASS：两条平台线程执行路径均通过。\n';
        } else if (subclassPass && !currentPass && protocolPass) {
          setStatus('warning', 'currentThread() 异常');
          output.textContent += '\n[ConcurrencyBox] ROOT CAUSE：子线程可以执行，但 Thread.currentThread() 返回 null。\n';
        } else if (subclassPass && currentPass && directPass && holderPass && !runnablePass && protocolPass) {
          setStatus('warning', 'ScopedValue native 异常');
          output.textContent += '\n[ConcurrencyBox] ROOT CAUSE：holder 与任务正常，故障锁定在 ensureMaterializedForStackWalk native 路径。\n';
        } else if (recentText.includes('MONITOR_BEFORE|subclass') && !monitorPass) {
          setStatus('warning', '监视器路径异常');
          output.textContent += '\n[ConcurrencyBox] ROOT CAUSE：线程进入成功，但 synchronized 监视器路径失败。\n';
        } else {
          setStatus('error', '验证未通过');
          output.textContent += '\n[ConcurrencyBox] FAIL：平台线程尚未可靠进入 Java run()。\n';
        }
      } catch (error) {
        setCheck('#check-protocol', false);
        setStatus('error', '运行超时');
        output.textContent += '\n[timeout] 当前 JVM 未正常结束。请重新加载运行时。\n';
        output.textContent += '\n[debug raw output]\n' + recentText + '\n[/debug]\n';
      } finally {
        running = false;
        runButton.disabled = bootPhase !== 'ready';
        bootButton.disabled = false;
      }
    }

    bootButton.addEventListener('click', () => {
      if (bootPhase === 'loading') {
        stopWorker();
        bootPhase = 'idle';
        bootButton.textContent = '启动 JDK 21';
        stage.textContent = '启动已取消，可重新尝试。';
        progress.value = 0;
        setStatus('warning', '已取消');
      } else if (bootPhase === 'ready' || bootPhase === 'error') location.reload();
      else boot();
    });
    runButton.addEventListener('click', run);
    resetButton.addEventListener('click', () => { source.value = initialSource; });
    source.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        const start = source.selectionStart;
        const end = source.selectionEnd;
        source.setRangeText('    ', start, end, 'end');
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') run();
    });
  </script>
</body>
</html>`;

export const dynamic = 'force-dynamic';

export function GET() {
  return new Response(page, { headers: PAGE_HEADERS });
}
