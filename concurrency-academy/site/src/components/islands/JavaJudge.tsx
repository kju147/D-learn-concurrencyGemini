'use client';

// JavaJudge：浏览器内真实 JDK 21 判题岛（JavaBox WASM）
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader2, CircleCheck, CircleX } from 'lucide-react';
import { ensureReady, runFiles, onRunnerEvent, type RuntimeStatus } from '../../lib/javabox-runner';
import { JavaCodeEditor } from './java-code-editor';

export type JudgeSpec = {
  title: string;
  mission: string;          // 业务化题面
  starterName: string;      // 必须是 public class 名
  starter: string;          // 带 TODO 的起始代码
  tests: string;            // Tests.java 全文（单文件断言式）
  timeoutSec?: number;
};

type PackManifest = {
  id: string; title: string; mission: string; timeoutSec?: number;
  starter: string; tests: string; hints?: string[];
  /** 可选参考答案文件名（学员错 4 次后可查看） */
  solution?: string;
};

type PackData = { manifest: PackManifest; starterSrc: string; testsSrc: string; solutionSrc: string | null };

/** 练习包加载：manifest + 源码 + 可选参考答案 */
async function loadPack(id: string): Promise<PackData> {
  const base = `/exercises/${id}`;
  const manifest = (await (await fetch(`${base}/manifest.json`)).json()) as PackManifest;
  const [starterSrc, testsSrc, solutionSrc] = await Promise.all([
    fetch(`${base}/${manifest.starter}`).then((r) => r.text()),
    fetch(`${base}/${manifest.tests}`).then((r) => r.text()),
    manifest.solution
      ? fetch(`${base}/${manifest.solution}`).then((r) => (r.ok ? r.text() : null)).catch(() => null)
      : Promise.resolve(null),
  ]);
  return { manifest, starterSrc, testsSrc, solutionSrc };
}

export default function JavaJudge({ spec: initialSpec, packId, onPass }: { spec?: JudgeSpec; packId?: string; onPass?: () => void }) {
  const [resolved, setResolved] = useState<JudgeSpec | null>(initialSpec ?? null);
  const [pack, setPack] = useState<PackData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [code, setCode] = useState(initialSpec?.starter ?? '');
  /** 判负次数 → 提示阶梯的数据源 */
  const [fails, setFails] = useState(0);
  const [hintsShown, setHintsShown] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);
  const [status, setStatus] = useState<RuntimeStatus>('cold');
  const [stage, setStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [output, setOutput] = useState('');
  const [judge, setJudge] = useState<'idle' | 'pass' | 'fail'>('idle');
  const outRef = useRef<HTMLPreElement>(null);

  // 练习包延迟加载
  useEffect(() => {
    if (initialSpec || !packId || resolved) return;
    loadPack(packId)
      .then((p) => {
        setPack(p);
        setResolved({
          title: p.manifest.title,
          mission: p.manifest.mission,
          starterName: p.manifest.starter.replace(/\.java$/, ''),
          starter: p.starterSrc,
          tests: p.testsSrc,
          timeoutSec: p.manifest.timeoutSec ?? 60,
        });
        setCode(p.starterSrc);
      })
      .catch((e) => setLoadError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId]);

  useEffect(() => onRunnerEvent((e) => {
    if (e.type === 'status') setStatus(e.status);
    else { setStage(e.text); setProgress(e.progress); }
  }), []);

  async function judge2run() {
    setOutput('');
    setJudge('idle');
    try {
      if (status === 'cold' || status === 'dead') {
        await ensureReady();
      }
      // 练习包协议：入口文件（main 所在类）排最前；判题场景 = Tests 打头，run 模式 = 学员类直接跑
      const runMode = !spec.tests;
      const files = runMode
        ? [{ name: `${spec.starterName}.java`, content: code }]
        : [
            { name: 'Tests.java', content: spec.tests },
            { name: `${spec.starterName}.java`, content: code },
          ];
      const out = await runFiles(
        files,
        runMode ? spec.starterName : 'Tests',
        (spec.timeoutSec ?? 60) * 1000,
      );
      setOutput((out.stdout + (out.stderr ? '\n' + out.stderr : '')).trim());
      const m = out.stdout.match(/SUMMARY\s+(\d+)\/(\d+)/);
      const passed = Boolean(m && m[1] === m[2]);
      setJudge(passed ? 'pass' : 'fail');
      if (passed) { setFails(0); onPass?.(); }
      else setFails((f) => f + 1);
    } catch (e) {
      setOutput(e instanceof Error ? e.message : String(e));
      setJudge('fail');
      setFails((f) => f + 1);
    }
  }

  const busy = status === 'booting' || status === 'running';
  const [maximized, setMaximized] = useState(false);

  // 格式化：按花括号深度重排缩进（教学代码粒度足够），跳错字符串/注释
  const format = () => {
    import('../../editor/format').then(({ formatJavaCode }) => setCode(code => formatJavaCode(code)));
  };

  if (loadError) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 not-prose">练习包加载失败：{loadError}</div>;
  }
  if (!resolved) {
    return <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500 not-prose">练习包加载中……</div>;
  }
  const spec = resolved;

  const editorBlock = (heightClass: string, onRunShortcut?: () => void) => (
    <JavaCodeEditor
      value={code}
      exerciseId={spec.starterName}
      onChange={setCode}
      heightClass={heightClass}
      onRunShortcut={onRunShortcut}
    />
  );

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-y border-stone-100 bg-stone-50 px-3 py-2">
      <button onClick={judge2run} disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
        {status === 'cold' || status === 'dead' ? '启动 JVM 并判题（首次约 15s）' : status === 'booting' ? stage || '启动中…' : status === 'running' ? '判题中…' : '判题'}
      </button>
      <span className="rounded bg-stone-200 px-2 py-0.5 font-mono text-[10px] text-stone-500">Ctrl+Enter 也能跑</span>
      <button onClick={format} className="rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-white">格式化</button>
      <button onClick={() => setCode(spec.starter)} className="rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-white">重置代码</button>
      {/* 提示阶梯：判负一次才出提示按钮；四级后允看参考答案 */}
      {fails >= 1 && pack?.manifest.hints?.length && hintsShown < pack.manifest.hints.length ? (
        <button onClick={() => setHintsShown((n) => Math.min(n + 1, pack!.manifest.hints!.length))}
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">
          💡 提示 {hintsShown}/{pack.manifest.hints.length}
        </button>
      ) : null}
      {fails >= 4 && pack?.solutionSrc && !solutionShown ? (
        <button onClick={() => { setSolutionShown(true); setCode(pack!.solutionSrc!); }}
          className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100">
          📖 看参考答案（你已尝试 {fails} 次）
        </button>
      ) : null}
      <button onClick={() => setMaximized(!maximized)}
        className="rounded-md border border-teal-600 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100">
        {maximized ? '⇱ 还原' : '⛶ 全屏编码'}
      </button>
      {status === 'booting' && (
        <div className="h-1 basis-full overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <AnimatePresence>
        {judge !== 'idle' && (
          <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold
              ${judge === 'pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {judge === 'pass' ? <CircleCheck className="size-4" /> : <CircleX className="size-4" />}
            {judge === 'pass' ? '验收通过' : '未过验收'}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );

  // 关键点：全屏不重建编辑器实例——只把同一个外层容器切到 fixed 视口模式，
  // 编辑器 DOM/光标/选择全保留，关掉即还原（不会出现两套实例互踩）
  const containerCls = maximized
    ? 'fixed inset-0 z-50 flex flex-col overflow-hidden bg-white not-prose'
    : 'overflow-hidden rounded-2xl border border-stone-200 bg-white not-prose';

  return (
    <>
      {maximized && <div className="fixed inset-0 z-40 bg-stone-950/60 backdrop-blur-sm" onClick={() => setMaximized(false)} />}
      <div className={containerCls}>
        <div className="border-b border-stone-100 px-4 py-3">
          <p className="text-xs font-bold text-teal-700">⚖️ 判题练习 · 浏览器内真实 JDK 21</p>
          <p className="mt-1 text-sm font-semibold text-stone-800">{spec.title}</p>
          {!maximized && <p className="mt-1 text-xs leading-5 text-stone-500">{spec.mission}</p>}
        </div>

        {toolbar}

        {/* 展开后的提示阶梯（判第几次出第几道提示） */}
        {hintsShown > 0 && pack?.manifest.hints && (
          <div className="border-b border-amber-200 bg-amber-50/60 px-4 py-3 not-prose">
            <p className="text-xs font-bold text-amber-800">💡 提示（你已失败 {fails} 次，下面是逐个放出来的提示）</p>
            <ol className="mt-2 space-y-1.5 pl-4 text-sm leading-6 text-amber-900">
              {pack.manifest.hints.slice(0, hintsShown).map((h, i) => (
                <li key={i}><span className="mr-1 font-mono text-[10px] text-amber-600">#{i + 1}</span>{h}</li>
              ))}
            </ol>
          </div>
        )}

        {/* 同一个编辑器实例，外层换 CSS 模式而已 */}
        <div className={`border-b border-stone-100 ${maximized ? 'min-h-0 flex-1' : ''}`}>
          {editorBlock(maximized ? 'h-full' : 'min-h-[420px]', judge2run)}
        </div>
        <pre ref={outRef} data-testid="judge-out"
          className={`overflow-auto bg-stone-50 p-4 font-mono text-[11.5px] leading-5 text-stone-700 ${maximized ? 'max-h-40 border-t border-stone-200' : 'max-h-64'}`}>
          {output || '（判题输出会出现在这里。判定标准：多次并发运行，断言全部成立才算过，不是"打印对一次"。）'}
        </pre>
      </div>
    </>
  );
}
