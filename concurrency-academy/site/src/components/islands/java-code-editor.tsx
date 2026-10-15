'use client';

// Monaco（VS Code 内核） Java 代码编辑器。
// 选用 Monaco，不自研看待匹配排序规则——Monaco 测度即 VS Code 的。
// SSR 层面不能 import 本体；因此全部隔着 await import 才开始。
'use strict';

import { useEffect, useRef } from 'react';
import type * as Monaco from 'monaco-editor';
import { getStatus, runDiagnostics } from '../../lib/javabox-runner';
import { lookupClass, type ClassMeta, type MemberSig } from '../../editor/jdk-index';
import { getParser, collectVariableTypes } from '../../editor/ts-analysis';
// Vite 打包的编辑器核心 worker（不依赖 public/monaco 目录）
// Java 无语言服务器，worker 仅 diff/词计算；内联 Blob 兜底（exports 通配与 ?worker 在 Rollup 里相冲）

if (typeof window !== 'undefined') {
  (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker: () => new Worker(URL.createObjectURL(new Blob(['self.onmessage=()=>{}'], { type: 'text/javascript' }))),
  };
}

/* ---------- 课程词汇目录 ---------- */

type CompleKind = 'class' | 'interface' | 'method' | 'snippet' | 'keyword';

const CLASS_DEFS: { label: string; detail: string; doc: string; insert?: string }[] = [
  { label: 'Thread', detail: 'java.lang.Thread', doc: '线程抽象。JDK 21 写法推荐 Thread.ofPlatform() / ofVirtual()' , insert: 'Thread' },
  { label: 'Runnable', detail: 'java.lang.Runnable', doc: '可运行任务（run() 不带返回值）' },
  { label: 'Callable', detail: 'java.util.concurrent.Callable', doc: '可返回值可抛出的任务，配 FutureTask/线程池' },
  { label: 'FutureTask', detail: 'java.util.concurrent.FutureTask', doc: '可运行、可取消、可取得结果的异步计算' },
  { label: 'CompletableFuture', detail: 'java.util.concurrent.CompletableFuture', doc: '异步编排对象：转换/组合/超时/异常' },
  { label: 'CompletionStage', detail: 'java.util.concurrent.CompletionStage', doc: '可被继续组合的异步阶段' },
  { label: 'ExecutorService', detail: 'java.util.concurrent.ExecutorService', doc: '线程池表面类型' },
  { label: 'Executors', detail: 'java.util.concurrent.Executors', doc: '快捷池工厂；newFixedThreadPool/newCachedThreadPool 等' },
  { label: 'ThreadPoolExecutor', detail: 'java.util.concurrent.ThreadPoolExecutor', doc: '控制核心数/队列/拒绝策略/线程工厂' },
  { label: 'CountDownLatch', detail: 'java.util.concurrent.CountDownLatch', doc: '倒计数组锁' },
  { label: 'CyclicBarrier', detail: 'java.util.concurrent.CyclicBarrier', doc: '循环界线' },
  { label: 'Semaphore', detail: 'java.util.concurrent.Semaphore', doc: '许可证数模型' },
  { label: 'Phaser', detail: 'java.util.concurrent.Phaser', doc: '分阶段协作' },
  { label: 'ReentrantLock', detail: 'java.util.concurrent.locks.ReentrantLock', doc: '可中断与超时的显式锁' },
  { label: 'Condition', detail: 'java.util.concurrent.locks.Condition', doc: '每个锁可有多份条件队列' },
  { label: 'ReadWriteLock', detail: 'java.util.concurrent.locks.ReadWriteLock', doc: '读写分离' },
  { label: 'ReentrantReadWriteLock', detail: 'java.util.concurrent.locks.ReentrantReadWriteLock', doc: '读写锁实现' },
  { label: 'StampedLock', detail: 'java.util.concurrent.locks.StampedLock', doc: '乐观读性能锁' },
  { label: 'AtomicInteger', detail: 'java.util.concurrent.atomic.AtomicInteger', doc: 'CAS 原子累计' },
  { label: 'AtomicLong', detail: 'java.util.concurrent.atomic.AtomicLong', doc: '同上' },
  { label: 'AtomicBoolean', detail: 'java.util.concurrent.atomic.AtomicBoolean', doc: '开关原子操作' },
  { label: 'AtomicReference', detail: 'java.util.concurrent.atomic.AtomicReference', doc: '原子引用' },
  { label: 'LongAdder', detail: 'java.util.concurrent.atomic.LongAdder', doc: '高频强竞争计数优先' },
  { label: 'ConcurrentHashMap', detail: 'java.util.concurrent.ConcurrentHashMap', doc: '高并发哈希表' },
  { label: 'CopyOnWriteArrayList', detail: 'java.util.concurrent.CopyOnWriteArrayList', doc: '读远多于写的快照表' },
  { label: 'BlockingQueue', detail: 'java.util.concurrent.BlockingQueue', doc: '生产者-消费者队列基础' },
  { label: 'ArrayBlockingQueue', detail: 'java.util.concurrent.ArrayBlockingQueue', doc: '有界环形队列' },
  { label: 'LinkedBlockingQueue', detail: 'java.util.concurrent.LinkedBlockingQueue', doc: '链表队列' },
  { label: 'TimeUnit', detail: 'java.util.concurrent.TimeUnit', doc: '时间单位' },
  { label: 'System', detail: 'java.lang.System', doc: 'out/err、currentTimeMillis、exit 等' },
  { label: 'InterruptedException', detail: 'java.lang.InterruptedException', doc: '阻塞别响应中断时抛出' },
  { label: 'Object', detail: 'java.lang.Object', doc: '所有类的根' },
  { label: 'String', detail: 'java.lang.String', doc: '字符串' },
  { label: 'StringBuilder', detail: 'java.lang.StringBuilder', doc: '字符串拼接器' },
  { label: 'Optional', detail: 'java.util.Optional', doc: '可缺省包装' },
];

const THREAD_STATIC: { label: string; detail: string; insert: string; doc: string }[] = [
  { label: 'ofVirtual()', detail: 'JDK 21 虚拟线程构建器', insert: 'ofVirtual()', doc: '轻量虚拟线程；不要池化' },
  { label: 'ofPlatform()', detail: 'JDK 19+ 平台线程构建器', insert: 'ofPlatform()', doc: '传统 OS 线程' },
  { label: 'startVirtualThread(task)', detail: 'JDK 21 启动虚拟线程', insert: 'startVirtualThread(${1:task})', doc: '创建并启动一个虚拟线程' },
  { label: 'currentThread()', detail: '返回当前线程', insert: 'currentThread()', doc: '可用于诊断与恢复标记' },
  { label: 'sleep(millis)', detail: '暂停当前线程', insert: 'sleep(${1:100})', doc: '不释放监视器锁；throws InterruptedException' },
];

const SYSTEM_MEMBERS: { label: string; detail: string; insert: string; doc: string }[] = [
  { label: 'out.println(${1})', detail: 'System.out 打印', insert: 'out.println(${1})', doc: '最常敲的一句' },
  { label: 'err.println(${1})', detail: 'System.err 打印', insert: 'err.println(${1})', doc: '标准错误' },
  { label: 'currentTimeMillis()', detail: 'System.currentTimeMillis()', insert: 'currentTimeMillis()', doc: '毫秒时间' },
  { label: 'nanoTime()', detail: 'System.nanoTime()', insert: 'nanoTime()', doc: '纳秒计时' },
  { label: 'exit(${1:0})', detail: 'System.exit(int)', insert: 'exit(${1:0})', doc: '退出 JVM' },
  { label: 'getProperty(${1:name})', detail: 'System.getProperty(String)', insert: 'getProperty(${1:name})', doc: '系统属性' },
];

const THREAD_INSTANCE: { label: string; detail: string; insert: string; doc: string }[] = [
  { label: 'start()', detail: '启动新线程', insert: 'start()', doc: 'run() 只是普通方法调用，不是异步启动' },
  { label: 'join()', detail: '等待线程结束', insert: 'join()', doc: '在线程终止后产生 happens-before' },
  { label: 'interrupt()', detail: '请求协作式中断', insert: 'interrupt()', doc: '"礼貌的请离开"信号' },
  { label: 'isInterrupted()', detail: '读取中断标记', insert: 'isInterrupted()', doc: '不清除标记' },
  { label: 'getName()', detail: '读线程名', insert: 'getName()', doc: '诊断与日志最常用' },
];

const KEYWORDS = 'public private protected class interface enum record static final abstract void int long boolean double char byte short new return try catch finally throw throws while for do if else break continue switch case default synchronized volatile transient this super extends implements instanceof import package'.split(' ');

const SNIPPETS: { label: string; insert: string; doc: string }[] = [
  {
    label: '平台线程（JDK 21 Builder）',
    insert: 'Thread ${1:worker} = Thread.ofPlatform()\n\t.name("${1:worker}")\n\t.start(() -> {\n\t\t${2}\n\t});',
    doc: 'Builder 写法——名字必须自己留',
  },
  {
    label: '虚拟线程（JDK 21）',
    insert: 'Thread.ofVirtual().name("${1}").start(() -> {\n\t${2}\n});',
    doc: '高并发阻塞 I/O 的日常样子', 
  },
  {
    label: '正确响应中断的模式',
    insert: 'try {\n\t${1:Blocking call}\n} catch (InterruptedException e) {\n\tThread.currentThread().interrupt();\n\treturn;\n}',
    doc: '别吞任何 InterruptedException',
  },
];

/* ---------- 编辑器主程序（动态 import + 各类适配） ---------- */

let completionProviderRegistered = false;
let signatureProviderRegistered = false;

// 模块级共享缓存：解决同页多套编辑器实例（React 严格模式/页面重挂载）导致
// provider 闭包绑错 aging 实例、拿不到变量类型表的问题
const SHARED_VARS: { map: Map<string, string> } = { map: new Map() };

function rebuildVarsIntoShared(text: string) {
  // 同步先落词法兜底（立即可用），异步 tree-sitter AST 就绪后升级
  SHARED_VARS.map = fallbackVars(text);
  getParser()
    .then((p) => { const r = collectVariableTypes(text, p); if (r.size) SHARED_VARS.map = r; })
    .catch(() => { /* 兜底已就位 */ });
}

// 词法兜底：tree-sitter 未就绪/挂掉时先用声明正则顶上（Type x = ...）
function fallbackVars(text: string): Map<string, string> {
  const m = new Map<string, string>();
  const re = /\b([A-Z][A-Za-z0-9_]*(?:<[^>]*>)?)\s+([a-z_$][\w$]*)\s*[=;)/,]/g;
  let mt;
  while ((mt = re.exec(text)) !== null) m.set(mt[2], mt[1].replace(/<.*>$/, ''));
  return m;
}

export function JavaCodeEditor({
  value,
  exerciseId,
  onChange,
  heightClass = 'min-h-[480px]',
  onRunShortcut,
}: {
  value: string;
  exerciseId: string;
  onChange: (value: string) => void;
  heightClass?: string;
  /** Ctrl+Enter 触发（判题快捷方式等宿主自定义） */
  onRunShortcut?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const subRef = useRef<Monaco.IDisposable | null>(null);
  const runShortcutRef = useRef(onRunShortcut);
  useEffect(() => { runShortcutRef.current = onRunShortcut; }, [onRunShortcut]);

  useEffect(() => {
    let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
    const relayoutTimers: ReturnType<typeof setTimeout>[] = [];
    let unmounted = false;

    (async () => {
      const monaco = await import('monaco-editor');
      if (import.meta.env.DEV) console.log('[monaco] module loaded');
      if (unmounted || !hostRef.current) return;

      monaco.editor.defineTheme('course-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: '22d3ee' },
          { token: 'string', foreground: 'fbbf24' },
          { token: 'number', foreground: 'c4b5fd' },
          { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        ],
        colors: {
          'editor.background': '#020617',
          'editor.foreground': '#e2e8f0',
          'editor.lineHighlightBackground': '#0f172a99',
          'editorCursor.foreground': '#67e8f9',
          'editor.selectionBackground': '#164e63aa',
          'editorLineNumber.foreground': '#334155',
          'editorLineNumber.activeForeground': '#a5f3fc',
          'editorIndentGuide.background': '#1e293b',
        },
      });

      editor = monaco.editor.create(hostRef.current, {
        value,
        language: 'java',
        theme: 'course-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        lineHeight: 1.65,
        padding: { top: 16, bottom: 16 },
        scrollBeyondLastLine: false,
        wordBasedSuggestions: 'currentDocument',
        acceptSuggestionOnEnter: 'on',
        snippetSuggestions: 'bottom',
        quickSuggestions: { other: true, comments: false, strings: false },
        quickSuggestionsDelay: 60,
        suggestOnTriggerCharacters: true,
        tabCompletion: 'off',
        parameterHints: { enabled: true, cycle: true },
        hover: { enabled: 'on', delay: 180 },
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: 'active', indentation: true },
        renderWhitespace: 'none',
        wordWrap: 'off',
        editContext: false,  // 0.56 默认 EditContext 对自动化输入与部分 IME 有坑，回退经典 textarea 输入
        fixedOverflowWidgets: true,  // 弹层挂到 body，不被动画容器（transform/motion）含块裁剪
      });

      editorRef.current = editor;
      if (import.meta.env.DEV) (window as unknown as { __jce?: unknown }).__jce = editor;

      // Ctrl+Enter → 宿主快捷动作（判题运行）
      editor.addAction({
        id: 'course.run',
        label: '运行/判题',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => runShortcutRef.current?.(),
      });

      // 布局竞态兜底：壳布局晚于岛屿挂载时 automaticLayout 首帧可能量到 0 高，强制重排几拍
      editor.layout();
      relayoutTimers.push(...[100, 300, 800].map((ms) => setTimeout(() => editor?.layout(), ms)));

      subRef.current = editor.onDidChangeModelContent(() => {
        onChange(editor!.getValue());
      });

      // 真编译诊断：浏览器内 JVM 就绪时，规则 javac 的 squiggles
      let diagTimer: ReturnType<typeof setTimeout> | null = null;
      const scheduleDiag = () => {
        if (diagTimer) clearTimeout(diagTimer);
        diagTimer = setTimeout(() => {
          if (getStatus() !== 'ready' || !editorRef.current) return;
          const code = editorRef.current.getValue();
          const nameMatch = code.match(/public\s+(?:final\s+)?(?:class|interface|enum|record)\s+(\w+)/);
          const className = nameMatch ? nameMatch[1] : 'Main';
          runDiagnostics(code, className)
            .then(({ diagnostics }) => {
              const model = editorRef.current?.getModel();
              if (!model) return;
              monaco.editor.setModelMarkers(
                model,
                'javac',
                diagnostics.map((d) => ({
                  startLineNumber: d.line,
                  startColumn: d.column,
                  endLineNumber: d.line,
                  endColumn: d.column + 4,
                  severity:
                    d.kind === 'ERROR' ? monaco.MarkerSeverity.Error
                    : d.kind === 'WARNING' ? monaco.MarkerSeverity.Warning
                    : monaco.MarkerSeverity.Info,
                  message: d.message,
                  source: 'javac（浏览器内的真编译器）',
                })),
              );
            })
            .catch(() => { /* 诊断出错不打扰 */ });
        }, 900);
      };
      const diagListener = editor!.onDidChangeModelContent(scheduleDiag);

      // AST 变量类型索引：内容变化后写入模块级共享缓存（tree-sitter WASM 懒加载 + 词法兜底）
      const rebuild = () => rebuildVarsIntoShared(editorRef.current?.getValue() ?? '');
      rebuild();
      const astListener = editor!.onDidChangeModelContent(() => rebuild());

      if (import.meta.env.DEV) {
        (window as unknown as { __editorDebug?: () => unknown }).__editorDebug = () => ({
          vars: [...SHARED_VARS.map.entries()],
        });
      }

      if (!completionProviderRegistered) {
        monaco.languages.registerCompletionItemProvider('java', {
          triggerCharacters: ['.'],
          provideCompletionItems(model, position) {
            const word = model.getWordUntilPosition(position);
            const range = new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn,
            );
            const lineBefore = model.getLineContent(position.lineNumber)
              .slice(0, word.startColumn - 1);

            const kindMap: Record<CompleKind, Monaco.languages.CompletionItemKind> = {
              class: monaco.languages.CompletionItemKind.Class,
              interface: monaco.languages.CompletionItemKind.Interface,
              method: monaco.languages.CompletionItemKind.Method,
              snippet: monaco.languages.CompletionItemKind.Snippet,
              keyword: monaco.languages.CompletionItemKind.Keyword,
            };
            const toCompletion = (
              kind: CompleKind, label: string, detail: string, docAdditional: string, insert?: string,
            ): Monaco.languages.CompletionItem => ({
              label,
              kind: kindMap[kind],
              detail,
              documentation: docAdditional,
              insertText: insert ?? label,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            });

            // 当前文档里用户自己写的方法（IDEA 风格：敲 work() 这种"自己类的方法"也要提示）
            const ownMethods: Monaco.languages.CompletionItem[] = [];
            const methodRe = /(?:public|private|protected)?\s*(?:static\s+)?([\w<>\[\]]+)\s+(\w+)\s*\(([^)]*)\)/g;
            let mm0;
            const docText = model.getValue();
            while ((mm0 = methodRe.exec(docText)) !== null) {
              const [, rt, name, params] = mm0;
              if (['if', 'for', 'while', 'switch', 'catch', 'return', 'new'].includes(name)) continue;
              if (rt === 'class' || rt === 'interface') continue;
              ownMethods.push(toCompletion(
                'method',
                `${name}(${params})`,
                `${rt} · 本类方法`,
                `本类自定义方法`,
                `${name}(${params ? '${1}' : ''})`,
              ));
            }

            /** 元数据成员 → CompletionItem（含受检异常标注） */
            const memberToItem = (mem: MemberSig): Monaco.languages.CompletionItem => {
              const throwsNote = mem.throws?.length ? `⚠ 受检异常：${mem.throws.join('、')} —— 必须 try/catch 或声明 throws\n\n` : '';
              return toCompletion('method', mem.name, `${mem.returns} · ${throwsNote ? '⚠ ' : ''}${''}`, throwsNote + mem.doc, mem.insert);
            };
            const staticsOf = (meta: ClassMeta) => meta.members.filter((m) => m.isStatic);
            const instancesOf = (meta: ClassMeta) => meta.members.filter((m) => !m.isStatic);

            let items: Monaco.languages.CompletionItem[] = [];
            const memberMatch = /([A-Za-z_$][\w$]*)\s*\.\s*$/.exec(lineBefore);

            if (memberMatch) {
              const receiver = memberMatch[1];
              const asClass = lookupClass(receiver);
              const varType = SHARED_VARS.map.get(receiver);
              const asVarClass = varType ? lookupClass(varType) : null;

              if (receiver === 'this') {
                // this. → 本类方法（你写的 work() 这种）
                items = ownMethods;
              } else if (receiver === 'System') {
                // System.out / out.println 两级快捷直达
                items = [
                  ...SYSTEM_MEMBERS.map((c) => toCompletion('method', c.label, c.detail, c.doc, c.insert)),
                  ...staticsOf(lookupClass('System')!).map(memberToItem),
                  ...(lookupClass('System')!.fields ?? []).map((f) => toCompletion('class', f.name, f.type, f.doc, f.name)),
                ];
              } else if (asClass) {
                // 类名后跟 .：静态成员 + 静态字段（实例成员也在，但排后；IDEA 语义如此）
                items = [
                  ...staticsOf(asClass).map(memberToItem),
                  ...(asClass.fields ?? []).map((f) => toCompletion('class', f.name, f.type, f.doc, f.name)),
                  ...instancesOf(asClass).map(memberToItem),
                ];
              } else if (asVarClass) {
                // 局部变量后跟 .：按声明类型给实例成员——这就是 IDEA 的"类型感知补全"
                items = [
                  ...instancesOf(asVarClass).map(memberToItem),
                  ...(asVarClass.fields ?? []).filter((f) => !f.isStatic).map((f) => toCompletion('class', f.name, f.type, f.doc, f.name)),
                ];
              } else if (/\b\w+\s*\.$/.test(lineBefore)) {
                items = THREAD_INSTANCE.map((c) => toCompletion('method', c.label, c.detail, c.doc, c.insert));
              }
            }
            if (items.length === 0 && !memberMatch) {
              items = [
                ...CLASS_DEFS.map((c) => toCompletion('class', c.label, c.detail, c.doc, c.insert)),
                ...KEYWORDS.map((label) => toCompletion('keyword', label, 'Java 关键字', '')),
                ...THREAD_INSTANCE.map((c) => toCompletion('method', c.label, c.detail, c.doc, c.insert)),
                ...THREAD_STATIC.map((c) => toCompletion('method', c.label, c.detail, c.doc, c.insert)),
                ...SYSTEM_MEMBERS.map((c) => toCompletion('method', c.label, c.detail, c.doc, c.insert)),
                ...SNIPPETS.map((c) => toCompletion('snippet', c.label, '教学代码片段', c.doc, c.insert)),
                // AST 层：可见局部变量/字段/形参（IDEA 的"变量名建议"）
                ...[...SHARED_VARS.map.entries()].map(([v, t]) =>
                  toCompletion('method', v, `:${t}`, `（已声明的 ${t} 类型变量）`, v)),
                // 本类自定义方法（sp如 work()）
                ...ownMethods,
              ];
            }

            if (import.meta.env.DEV) console.log('[suggest] lineBefore=<' + lineBefore + '> memberMatch=' + JSON.stringify(memberMatch?.[1] ?? null) + ' asClass=' + (memberMatch ? String(!!lookupClass(memberMatch[1])) : '') + ' varType=' + JSON.stringify(memberMatch ? SHARED_VARS.map.get(memberMatch[1]) ?? null : null) + ' items=' + items.length);
            return { suggestions: items };
          },
        });
        completionProviderRegistered = true;

        // 签名提示（IDEA 的 Ctrl+P）：new X( 或方法调用 ( 时弹构造器/方法形参
        if (!signatureProviderRegistered) {
          monaco.languages.registerSignatureHelpProvider('java', {
            signatureHelpTriggerCharacters: ['(', ','],
            provideSignatureHelp(model, position) {
              const empty = { value: { signatures: [], activeParameter: 0, activeSignature: 0 }, dispose() {} };
              const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
              // new X( … 优先
              let mm = /new\s+([A-Za-z_$][\w$]*)\s*\(([^()]*)$/.exec(line);
              let isCtor = true;
              if (!mm) { mm = /([A-Za-z_$][\w$]*)\s*\(([^()]*)$/.exec(line); isCtor = false; }
              if (!mm) return empty;
              const name = mm[1];
              const activeParam = (mm[2].match(/,/g) ?? []).length;

              const meta = lookupClass(name);
              if (!meta) return empty;

              let signatures: Monaco.languages.SignatureInformation[];
              if (isCtor) {
                signatures = (meta.constructors ?? []).map((c) => ({
                  label: c.sig,
                  documentation: c.doc,
                  parameters: [],
                }));
              } else {
                signatures = meta.members
                  .filter((m2) => m2.name.startsWith(name + '('))
                  .map((m2) => ({ label: m2.name, documentation: m2.doc, parameters: [] }));
              }
              if (signatures.length === 0) return empty;
              return {
                value: { signatures, activeSignature: 0, activeParameter: Math.min(activeParam, 99) },
                dispose() {},
              };
            },
          });
          signatureProviderRegistered = true;
        }
      }
      if (import.meta.env.DEV) console.log('[monaco] providers registered? completion=' + completionProviderRegistered + ' signature=' + signatureProviderRegistered);
    })();

    return () => {
      unmounted = true;
      relayoutTimers.forEach(clearTimeout);
      subRef.current?.dispose();
      if (editor) editor.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId]); // 只在挂载/换题时创建（hostRef.current 不稳定的对象引用会反复重建编辑器）

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getValue() !== value) editor.setValue(value);
  }, [value]);

  return (
    <div
      ref={hostRef}
      className={`${heightClass} w-full`}
      aria-label="Java 代码编辑器（Monaco）"
    />
  );
}
