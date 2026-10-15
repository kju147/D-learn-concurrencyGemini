'use client';

// LevelFlow：一节课的"关卡流"外壳——一屏一关、过了解锁下一关、不再是一屏长文。
// 关卡类型（MVP）：story（钩子/收拢文本卡）/ sim（剧场+接管）/ judge（真实判题）/ done（终点）
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Lock } from 'lucide-react';
import ScenePlayer from './ScenePlayer';
import JavaJudge, { type JudgeSpec } from './JavaJudge';
import ThreadLifecycle from './anim/ThreadLifecycle';

// 自动放映动画注册表：sim 是"可交互模拟器"，anim 是"纯粹看完就懂的戏"
const ANIM_REGISTRY: Record<string, () => ReturnType<typeof ThreadLifecycle>> = {
  'thread-lifecycle': ThreadLifecycle,
};

export type LevelStep =
  | { kind: 'story'; id: string; title: string; body: string; bullets?: string[]; anim?: 'thread-lifecycle' }
  | { kind: 'sim'; id: string; title: string; sceneKey: string; hint?: string; gate?: 'watch-to-end' }
  | { kind: 'judge'; id: string; title: string; spec?: JudgeSpec; packId?: string }
  | { kind: 'done'; id: string; title: string; body: string };

export default function LevelFlow({ sceneTitle, steps }: { sceneTitle: string; steps: LevelStep[] }) {
  const [cursor, setCursor] = useState(0);
  // 可测试性/demos：?step=judge 挂载后跳关（必须在 useEffect 里做，否则会 SSR/水合不一致）
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('step');
    if (!q) return;
    const i = steps.findIndex((s) => s.id === q || s.kind === q);
    if (i > 0) setCursor(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [watched, setWatched] = useState<Record<string, boolean>>({});
  const [passed, setPassed] = useState<Record<string, boolean>>({});
  const [storySeen, setStorySeen] = useState<Record<string, boolean>>({});

  const total = steps.length;
  const step = steps[cursor];
  const isDoneStep = step.kind === 'done';

  function gateOpen(i: number): boolean {
    const s = steps[i];
    if (s.kind === 'sim') return Boolean(watched[s.id]);
    if (s.kind === 'judge') return Boolean(passed[s.id]);
    return storySeen[s.id] ?? false; // story/recap：点"我看完了"放行（读没读懂靠后面的判题倒逼）
  }

  function canGo(i: number): boolean {
    if (i <= 0) return true;
    if (i >= total) return false;
    return gateOpen(i - 1);
  }

  const doneCount = useMemo(() => steps.filter((s) => (s.kind === 'sim' ? watched[s.id] : s.kind === 'judge' ? passed[s.id] : storySeen[s.id])).length, [steps, watched, passed, storySeen]);

  /**
   * 极简 markdown 渲染（教学正文专用）：支持 ```代码块```、行内 `code`、**加粗**、段落换行。
   * 不再走 CSS white-space:pre-line 裸放（那样 ``` 代码块会被当普通文本堆出来）。
   */
  function renderBody(body: string): ReactNode {
    const parts: ReactNode[] = [];
    const segs = body.split(/```([\s\S]*?)```/g);
    segs.forEach((seg, i) => {
      if (i % 2 === 1) {
        parts.push(
          <pre key={i} className="my-3 overflow-x-auto rounded-xl bg-stone-900 p-4 font-mono text-[13px] leading-6 text-teal-100">{seg.trim()}</pre>,
        );
      } else if (seg.trim()) {
        // 行内 code 与加粗
        const inline = seg.split(/(`[^`]+`)/g).map((piece, j) => {
          if (piece.startsWith('`') && piece.endsWith('`')) {
            return <code key={j} className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[13px] text-teal-800">{piece.slice(1, -1)}</code>;
          }
          const bold = piece.split(/(\*\*[^*]+\*\*)/g).map((p2, k) =>
            p2.startsWith('**') && p2.endsWith('**')
              ? <strong key={k} className="text-stone-900">{p2.slice(2, -2)}</strong>
              : p2,
          );
          return <span key={j}>{bold}</span>;
        });
        parts.push(<p key={i} className="whitespace-pre-line text-[15px] leading-8 text-stone-700">{inline}</p>);
      }
    });
    return parts;
  }

  function renderStep(s: LevelStep): ReactNode {
    switch (s.kind) {
      case 'story':
        return (
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-2xl">{s.title}</h2>
            <div className="mt-4">{renderBody(s.body)}</div>
            {s.anim && ANIM_REGISTRY[s.anim] && (() => { const A = ANIM_REGISTRY[s.anim as string]; return <A />; })()}
            {s.bullets && (
              <ul className="mt-4 space-y-2 text-sm leading-7 text-stone-600">
                {s.bullets.map((b) => <li key={b} className="flex gap-2"><span className="text-teal-600">▸</span>{b}</li>)}
              </ul>
            )}
          </div>
        );
      case 'sim':
        return (
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-xl">{s.title}</h2>
              {watched[s.id] && <span className="text-xs font-semibold text-teal-700">✓ 已看到结局</span>}
            </div>
            <ScenePlayer sceneKey={s.sceneKey} onFinale={() => setWatched((w) => ({ ...w, [s.id]: true }))} />
            {s.hint && <p className="mt-2 text-xs text-stone-400">{s.hint}</p>}
          </div>
        );
      case 'judge':
        return (
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-xl">{s.title}</h2>
              {passed[s.id] && <span className="text-xs font-semibold text-emerald-700">✓ 判题通过</span>}
            </div>
            <JavaJudge spec={s.spec} packId={s.packId} onPass={() => setPassed((p) => ({ ...p, [s.id]: true }))} />
          </div>
        );
      case 'done':
        return (
          <div className="mx-auto max-w-2xl py-8 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500 text-3xl text-white">🏁</div>
            <h2 className="font-display mt-4 text-2xl">{s.title}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-600">{s.body}</p>
          </div>
        );
    }
  }

  return (
    <div className="not-prose">
      {/* 进度条 */}
      <div className="mb-4 flex items-center gap-3">
        <p className="text-xs font-semibold text-stone-500">{sceneTitle}</p>
        <div className="flex flex-1 items-center gap-1.5">
          {steps.map((s, i) => {
            const done = gateOpen(i);
            const locked = !canGo(i);
            const current = i === cursor;
            return (
              <button key={s.id} onClick={() => canGo(i) && setCursor(i)} disabled={!canGo(i)}
                title={s.title}
                className={`h-1.5 flex-1 rounded-full transition ${done ? 'bg-teal-600' : current ? 'bg-stone-500' : 'bg-stone-200'} ${locked ? 'cursor-not-allowed' : 'hover:bg-teal-400'}`} />
            );
          })}
        </div>
        <span className="font-mono text-[10px] text-stone-400">{doneCount}/{total}</span>
      </div>

      {/* 当前关卡（一屏一关，带切换动画） */}
      <AnimatePresence mode="wait">
        <motion.section key={step.id + (step.kind === 'story' ? String(storySeen[step.id]) : '')}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
          {renderStep(step)}
          {step.kind === 'story' && (
            <div className="mx-auto mt-6 max-w-2xl">
              <button onClick={() => setStorySeen((m) => ({ ...m, [step.id]: true }))}
                className="rounded-lg bg-stone-800 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-700">
                {storySeen[step.id] ? '✓ 已读' : '我看完了，放行 →'}
              </button>
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      {/* 关卡导航 */}
      <div className="mt-4 flex items-center justify-between">
        <button onClick={() => setCursor((c) => Math.max(0, c - 1))} disabled={cursor === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40">
          <ArrowLeft className="size-3.5" /> 上一关
        </button>
        <p className="text-xs text-stone-400">{cursor + 1} / {total} · {step.title}</p>
        {isDoneStep ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800">
            <Check className="size-3.5" /> 本课完成
          </span>
        ) : (
          <button onClick={() => canGo(cursor + 1) && setCursor((c) => c + 1)} disabled={!canGo(cursor + 1)}
            className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-40">
            {canGo(cursor + 1) ? <>下一关 <ArrowRight className="size-3.5" /></> : <><Lock className="size-3.5" /> 完成本关解锁</>}
          </button>
        )}
      </div>
    </div>
  );
}
