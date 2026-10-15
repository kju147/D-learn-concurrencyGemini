'use client';

// Monaco（VS Code 内核） Java 代码编辑器。
// 选用 Monaco，不自研看待匹配排序规则——Monaco 测度即 VS Code 的。
// SSR 层面不能 import 本体；因此全部隔着 await import 才开始。
'use strict';

import { useEffect, useRef } from 'react';
import type * as Monaco from 'monaco-editor';
import { getStatus, runDiagnostics } from '@/lib/wasm-java-runner';

// 编辑器核心 worker 随我们静态分发（public/monaco/editor.worker.js）
if (typeof window !== 'undefined') {
  (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker: () => new Worker('/monaco/editor.worker.js', { type: 'module' }),
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

export function JavaCodeEditor({
  value,
  exerciseId,
  onChange,
}: {
  value: string;
  exerciseId: string;
  onChange: (value: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const subRef = useRef<Monaco.IDisposable | null>(null);

  useEffect(() => {
    let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
    let unmounted = false;

    (async () => {
      const monaco = await import('monaco-editor');
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
      });

      editorRef.current = editor;

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

            let items: Monaco.languages.CompletionItem[] = [];
            if (/\bThread\s*\.$/.test(lineBefore)) {
              items = THREAD_STATIC.map((c) => toCompletion('method', c.label, c.detail, c.doc, c.insert));
            } else if (/\bSystem\s*\.$/.test(lineBefore)) {
              items = SYSTEM_MEMBERS.map((c) => toCompletion('method', c.label, c.detail, c.doc, c.insert));
            } else if (/\b\w+\s*\.$/.test(lineBefore)) {
              items = THREAD_INSTANCE.map((c) => toCompletion('method', c.label, c.detail, c.doc, c.insert));
            } else {
              items = [
                ...CLASS_DEFS.map((c) => toCompletion('class', c.label, c.detail, c.doc, c.insert)),
                ...KEYWORDS.map((label) => toCompletion('keyword', label, 'Java 关键字', '')),
                ...THREAD_INSTANCE.map((c) => toCompletion('method', c.label, c.detail, c.doc, c.insert)),
                ...THREAD_STATIC.map((c) => toCompletion('method', c.label, c.detail, c.doc, c.insert)),
                ...SYSTEM_MEMBERS.map((c) => toCompletion('method', c.label, c.detail, c.doc, c.insert)),
                ...SNIPPETS.map((c) => toCompletion('snippet', c.label, '教学代码片段', c.doc, c.insert)),
              ];
            }
            return { suggestions: items };
          },
        });
        completionProviderRegistered = true;
      }
    })();

    return () => {
      unmounted = true;
      subRef.current?.dispose();
      if (editor) editor.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId, hostRef.current]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getValue() !== value) editor.setValue(value);
  }, [value]);

  return (
    <div
      ref={hostRef}
      className="min-h-[620px] w-full"
      aria-label="Java 代码编辑器（Monaco）"
    />
  );
}
