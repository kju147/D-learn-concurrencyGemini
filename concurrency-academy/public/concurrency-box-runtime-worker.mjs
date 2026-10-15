const runtimeBase = '/experimental/concurrency-box/runtime/';
// Cache-buster: '?v=...' keeps disk-cache staleness out of every runtime asset,
// including pthread worker and data files resolved through locateFile.
const assetVersion = new URL(self.location.href).searchParams.get('v') ?? '';
const assetUrl = (name) =>
  runtimeBase + name + (assetVersion ? `?v=${encodeURIComponent(assetVersion)}` : '');
let moduleInstance = null;
let readyResolve = null;
let readyTimer = null;
let pingTimer = null;
let lastDownloadPercent = -1;

function report(type, details = {}) {
  self.postMessage({ type, ...details });
}

function send(raw) {
  moduleInstance.ccall('jvm_stdin_write_string', null, ['string'], [raw]);
}

function stopReadyWait() {
  clearTimeout(readyTimer);
  clearInterval(pingTimer);
  readyTimer = null;
  pingTimer = null;
}

async function boot(jvmArgs) {
  try {
    report('stage', { text: '编译 WebAssembly 内核…', progress: 20 });
    const loadedModule = await import(assetUrl('javabox-direct.mjs'));

    report('stage', { text: '初始化 JVM 与 Java 编译器…', progress: 48 });
    const debugArgs = (jvmArgs || self.__JAVABOX_JVM_ARGS__ || '').split(' ').filter(Boolean);
    const options = {
      arguments: debugArgs,
      locateFile(path) { return assetUrl(path); },
      setStatus(text) {
        if (!text || !text.startsWith('Downloading data')) return;
        const match = text.match(/\((\d+)\/(\d+)\)/);
        const fraction = match && Number(match[2]) > 0
          ? Math.min(1, Number(match[1]) / Number(match[2]))
          : 0;
        const percent = Math.round(fraction * 100);
        if (percent === lastDownloadPercent) return;
        lastDownloadPercent = percent;
        report('stage', {
          text: '下载 JDK 21 文件系统… ' + percent + '%',
          progress: Math.round(35 + fraction * 35),
        });
      },
      print(text) {
        report('stdout', { text });
        if (text.includes('JBOX_PONG') && readyResolve) {
          const resolve = readyResolve;
          readyResolve = null;
          resolve();
        }
      },
      printErr(text) { report('stderr', { text }); },
      onExit(code) { report('exit', { code }); },
    };

    moduleInstance = await loadedModule.default(options);
    moduleInstance.ccall('jvm_enable_ring_buffer_stdin', null, [], []);
    report('stage', { text: '等待 CompileServer 就绪…', progress: 82 });

    await new Promise((resolve, reject) => {
      readyResolve = resolve;
      readyTimer = setTimeout(() => reject(new Error('CompileServer 启动超时')), 60000);
      pingTimer = setInterval(() => {
        try { send('JBOX_PING\n'); }
        catch (error) { reject(error); }
      }, 1000);
      send('JBOX_PING\n');
    });
    stopReadyWait();
    report('ready');
  } catch (error) {
    stopReadyWait();
    report('error', { message: error && error.message ? error.message : String(error) });
  }
}

self.onmessage = (event) => {
  const message = event.data;
  if (message.type === 'boot') {
    boot(message.jvmArgs);
  } else if (message.type === 'stdin' && moduleInstance) {
    try { send(message.value); }
    catch (error) {
      report('error', { message: error && error.message ? error.message : String(error) });
    }
  }
};
