'use client';

// 调度模拟器播放器（动画引擎 v2 的首个岛组件）
// 交互三模式：▶ 自动跑（seed 决定交错）/ ⏭ 步进 / 👆 探索模式（自己点选让哪个线程跑）
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, RotateCcw, StepForward, Hand, Dices } from 'lucide-react';
import { Sim, type ThreadDef } from '../../sim/engine';
import { getScene } from '../../sim/scenes';

const THREAD_COLORS = [
  { bar: 'bg-sky-500', soft: 'bg-sky-50 border-sky-200', text: 'text-sky-800' },
  { bar: 'bg-rose-500', soft: 'bg-rose-50 border-rose-200', text: 'text-rose-800' },
];

function insText(i: { op: string; [k: string]: unknown }): string {
  switch (i.op) {
    case 'load': return `getstatic ${i.name}  // 读主存`;
    case 'add': return `iadd  // 寄存器 ${String(i.delta).startsWith('-') ? '-' : '+'}${Math.abs(i.delta as number)}`;
    case 'store': return `putstatic ${i.name}  // 写回主存`;
    case 'lock': return `synchronized(${i.name}) 加锁`;
    case 'unlock': return `synchronized(${i.name}) 解锁`;
    case 'cas': return `cas(${i.name})`;
    case 'say': return `💬 ${i.text as string}`;
    default: return i.op;
  }
}

export default function SimPlayer({ sceneKey }: { sceneKey: string }) {
  const scene = getScene(sceneKey);
  const [seed, setSeed] = useState(7);
  const [explore, setExplore] = useState(true);
  const [history, setHistory] = useState<string[]>([]);

  const sim = useMemo(() => {
    const threads = scene.threads('A', 'B');
    const s = new Sim({ threads, mem: { ...scene.mem }, locks: scene.locks });
    if (!explore && history.length === 0) {
      // 自动模式初始就整跑一次（后续事件直接全量）
      s.run(seed);
    } else {
      for (const pick of history) s.step(pick);
    }
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneKey, seed, explore, history]);

  const liveThreads: ThreadDef[] = scene.threads('A', 'B');
  const done = sim.state.done;
  const counter = sim.state.mem['counter'];
  const expectedFinal = 2;
  const lost = done && counter !== expectedFinal;

  const runPick = (id: string) => {
    if (done || sim.state.pcs[id] >= liveThreads.find((t) => t.id === id)!.ins.length) return;
    setHistory((h) => [...h, id]);
  };

  const reset = () => setHistory([]);
  const roll = () => { setExplore(false); setSeed((s) => s + 1); setHistory([]); };
  const [autoPlaying, setAutoPlaying] = useState(false);
  const playAuto = () => {
    // 自动模式等价于一次性 run；播放效果 = 逐步展示
    setExplore(false);
    setHistory([]);
    setAutoPlaying(true);
    const fresh = new Sim({ threads: scene.threads('A', 'B'), mem: { ...scene.mem }, locks: scene.locks });
    const events = fresh.run(seed);
    const picks = events.map((e) => e.thread);
    let i = 0;
    const timer = setInterval(() => {
      if (i >= picks.length) { clearInterval(timer); setAutoPlaying(false); return; }
      const pick = picks[i++];
      setHistory((h) => [...h, pick]);
    }, 650);
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 not-prose">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-stone-800">{scene.title}</p>
        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700">seed #{seed}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={playAuto} disabled={autoPlaying}
            className="inline-flex items-center gap-1 rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
            {autoPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />} 自动跑
          </button>
          <button onClick={roll} disabled={autoPlaying}
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
            <Dices className="size-3.5" /> 换个事故
          </button>
          <button onClick={() => { setExplore(true); reset(); }} disabled={autoPlaying}
            className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium ${explore ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-stone-300 text-stone-600 hover:bg-stone-50'}`}>
            <Hand className="size-3.5" /> 亲手交错
          </button>
          <button onClick={reset} disabled={autoPlaying}
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50">
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs leading-6 text-stone-500">{scene.question}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
        {liveThreads.map((t, ti) => {
          const c = THREAD_COLORS[ti];
          const pc = sim.state.pcs[t.id];
          const reg = sim.state.regs[t.id];
          const exhausted = pc >= t.ins.length;
          return (
            <button key={t.id} onClick={() => explore && runPick(t.id)} disabled={!explore || done || exhausted}
              className={`rounded-xl border p-3 text-left transition ${c.soft} ${explore && !done && !exhausted ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : 'cursor-default'} disabled:opacity-80`}>
              <div className="flex items-center justify-between">
                <p className={`text-xs font-bold ${c.text}`}>线程 {t.label}</p>
                <span className="font-mono text-[10px] text-stone-400">{exhausted ? 'TERMINATED' : 'RUNNABLE'}</span>
              </div>
              <div className="mt-2 space-y-1">
                {t.ins.map((i, k) => (
                  <p key={k} className={`truncate rounded px-1.5 py-0.5 font-mono text-[11px] ${k === pc ? `${c.bar} text-white` : k < pc ? 'text-stone-400 line-through' : 'text-stone-600'}`}>
                    {insText(i)}
                  </p>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-stone-500">
                手里拿着：
                <AnimatePresence mode="popLayout">
                  <motion.span key={String(reg)} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }}
                    className="grid size-7 place-items-center rounded-md bg-white font-mono font-bold text-stone-800 shadow-sm">
                    {reg ?? '—'}
                  </motion.span>
                </AnimatePresence>
              </div>
            </button>
          );
        })}

        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-teal-200 bg-teal-50/60 px-5 py-3">
          <p className="text-[10px] font-bold text-teal-800">主内存（共享）</p>
          <motion.div key={String(counter)} initial={{ scale: 1.35 }} animate={{ scale: 1 }}
            className="grid size-12 place-items-center rounded-full bg-teal-700 font-mono text-lg font-bold text-white">
            {counter}
          </motion.div>
          <p className="font-mono text-[10px] text-teal-800/70">counter</p>
          {scene.locks && (
            <p className="text-[10px] text-stone-500">
              🔒 room：<span className="font-mono">{sim.state.locks['room'] ?? '空闲'}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 min-h-10 rounded-xl bg-stone-50 p-3 text-xs leading-6 text-stone-600">
        {done ? (
          lost ? (
            <span className="font-semibold text-rose-700">💥 事故发生了：期望 counter=2，实际={counter}。一次更新被碾过去了——这就是丢失更新。</span>
          ) : (
            <span className="font-semibold text-teal-700">✅ 本次交错没出事：counter={counter}。换个 seed 或亲手交换试试，事故总会到来。</span>
          )
        ) : (
          <span>已执行 {sim.events.length} 步。{explore ? '点击任意线程卡片，让它执行下一条指令——你在扮演调度器。' : '正在按 seed 自动调度……'}</span>
        )}
      </div>

      <p className="mt-2 text-[10px] leading-5 text-stone-400">{scene.expected}</p>
      {explore && (
        <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-stone-400">
          <StepForward className="size-3" /> 试着让 A 只执行前两步（读到 0、算好 1）就切换给 B——你能亲手碾丢一次更新。
        </p>
      )}
    </div>
  );
}
