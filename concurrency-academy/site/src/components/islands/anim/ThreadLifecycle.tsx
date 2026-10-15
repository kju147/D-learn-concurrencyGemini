'use client';

// ThreadLifecycle：六态自动放映的竖场（不用交互，看懂就行）
// 节拍：创建 → NEW → start → RUNNABLE → sleep → TIMED_WAITING → 醒来 → RUNNABLE → 跑完 → TERMINATED
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw } from 'lucide-react';

type Beat = {
  state: 'NEW' | 'RUNNABLE' | 'BLOCKED' | 'WAITING' | 'TIMED_WAITING' | 'TERMINATED';
  note: string;
  code: string;
  hold: number; // 停留毫秒
};

const BEATS: Beat[] = [
  { state: 'NEW', note: 'new Thread() 出来还没 start()——只是个对象，没上报给操作系统', code: 'Thread t = new Thread(() -> work());', hold: 2600 },
  { state: 'RUNNABLE', note: 't.start() 按下——就进入了"等待 CPU 分发"的队伍', code: 't.start();', hold: 2400 },
  { state: 'RUNNABLE', note: '烤着 CPU 就在 RUNNABLE 里跑着 run() 里的活', code: '// run() 里面的业务代码，可能是真的在施法', hold: 2200 },
  { state: 'TIMED_WAITING', note: '里面遇到一个 Thread.sleep(500)——进 TIMED_WAITING（不释放锁，只去睡觉）', code: 'Thread.sleep(500); // sleep 就顺这个堆', hold: 2800 },
  { state: 'RUNNABLE', note: '500 毫秒到了就被拉回战场——再次 RUNNABLE（睡完不是立刻执行，是继续排队）', code: '// 睡醒后回到 RUNNABLE 上', hold: 2400 },
  { state: 'TERMINATED', note: 'run() 方法跑完那一刻就 TERMINATED，这条线程的一生就结束了', code: '} // run 退出了', hold: 2600 },
];

const STATE_COLOR: Record<string, string> = {
  NEW: 'bg-stone-200 text-stone-600 border-stone-300',
  RUNNABLE: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  BLOCKED: 'bg-rose-100 text-rose-800 border-rose-300',
  WAITING: 'bg-amber-100 text-amber-800 border-amber-300',
  TIMED_WAITING: 'bg-sky-100 text-sky-800 border-sky-300',
  TERMINATED: 'bg-stone-900 text-stone-100 border-stone-700',
};

export default function ThreadLifecycle() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const cur = BEATS[idx];
  const seen = useMemo(() => new Set(BEATS.slice(0, idx + 1).map((b) => b.state)), [idx]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (idx < BEATS.length - 1) setIdx((i) => i + 1);
      else setPlaying(false);
    }, cur.hold);
    return () => clearTimeout(t);
  }, [playing, idx, cur.hold]);

  const done = idx === BEATS.length - 1;

  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 not-prose">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold text-teal-700">🎬 六态自动放映（不用交互，看懂就好）</p>
        <div className="flex gap-2">
          <button onClick={() => setPlaying(!playing)}
            className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white">
            <Play className="size-3.5" /> {playing ? '暂停' : '放映'}
          </button>
          <button onClick={() => { setIdx(0); setPlaying(false); }}
            className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-600">
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* 状态轨道 */}
      <div className="relative flex items-center gap-2 overflow-x-auto py-3">
        {(['NEW', 'RUNNABLE', 'BLOCKED', 'WAITING', 'TIMED_WAITING', 'TERMINATED'] as const).map((st) => (
          <motion.div key={st}
            animate={cur.state === st ? { scale: 1.12, y: -3 } : { scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className={`flex shrink-0 flex-col items-center rounded-full border-2 px-4 py-2 font-mono text-[11px] font-bold ${STATE_COLOR[st]} ${seen.has(st) ? '' : 'opacity-40'}`}>
            {st}
            {cur.state === st && <motion.span layoutId="pin" className="mt-0.5 h-1.5 w-1.5 rounded-full bg-current" />}
          </motion.div>
        ))}
      </div>

      {/* 走动的线程令牌 */}
      <div className="mt-1 grid grid-cols-[1fr_1.1fr] gap-3 items-start">
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
          <AnimatePresence mode="wait">
            <motion.p key={idx} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
              className="text-[13px] leading-7 text-stone-700">
              {cur.note}
            </motion.p>
          </AnimatePresence>
          <p className="mt-2 text-[10px] text-stone-400">这一步等 {cur.hold / 1000}s × （速率可下一轮改） </p>
        </div>
        <div className="rounded-xl bg-stone-900 p-4 font-mono text-[12.5px] leading-6 text-teal-100">
          {BEATS.slice(0, idx + 1).map((b, i) => (
            <div key={i} className={i === idx ? 'text-teal-300' : 'text-stone-600'}>{b.code}</div>
          ))}
        </div>
      </div>

      {done && (
        <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
          ✅ 走完一条命：NEW → RUNNABLE → TIMED_WAITING →（醒了）RUNNABLE → TERMINATED。
          WAITING / BLOCKED 的状态在戏里没出场，它们是下一辈在另两个故事才演的。
        </p>
      )}
    </div>
  );
}
