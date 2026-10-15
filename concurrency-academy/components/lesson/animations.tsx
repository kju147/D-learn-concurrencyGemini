'use client';

// 课程动画组件库：为并发概念设计的 SVG/过渡动画，不是装饰动画
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* 受控播放工具 */
function useTicker(on: boolean, ms = 160) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setTick((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [on, ms]);
}

function PlayerBar({
  playing, onToggle, onReset, step, total,
}: {
  playing: boolean; onToggle: () => void; onReset: () => void; step: number; total: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" variant="outline" onClick={onToggle}>
        {playing ? <Pause /> : <Play />}
        {playing ? '暂停' : '播放'}
      </Button>
      <Button size="sm" variant="ghost" onClick={onReset} disabled={playing}>
        <RotateCcw /> 重来
      </Button>
      <span className="ml-auto text-[10px] text-muted-foreground">
        动画在第 {step + 1} / {total} 帧
      </span>
    </div>
  );
}

/* ============================================================
 * TicketShop：丢失更新动画（两个售票员一个票库）
 * ============================================================ */

type ClerkFrame = {
  seat: number | null;          // 票库剩余
  aPaw: number | null;          // A 记下的数
  bPaw: number | null;
  sayA: string;
  sayB: string;
  note: string;
};

const clerkFrames: ClerkFrame[] = [
  { seat: 1, aPaw: null, bPaw: null, sayA: '我来看一下，还剩几张票', sayB: '我也在看——还剩几个', note: '卖票系统里只下一张票，两个售票员都想卖它' },
  { seat: 1, aPaw: 1, bPaw: null, sayA: '我看到了：还剩 1', sayB: '……', note: 'A 都还没动手卖，先看了库存' },
  { seat: 1, aPaw: 1, bPaw: 1, sayA: '，', sayB: '我也看到了：还剩 1！', note: 'B 也看到了 1，因为没有发生"我给客户刷票"的接待动作' },
  { seat: 0, aPaw: 0, bPaw: 1, sayA: '卖出！报表里已经零库存', sayB: '可我还看到 1，那我当然也卖', note: 'A 完成卖票——B 不知道库存变化' },
  { seat: -1, aPaw: null, bPaw: -1, sayA: '', sayB: '我也卖出去了……刷 0', note: 'B 也把票卖给了别人。同一个位置开支了两次：库存打出了负数，这栏节目就是"丢失更新"。' },
];

export function TicketShop() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setStep((s) => (s < clerkFrames.length - 1 ? s + 1 : s));
      if (step === clerkFrames.length - 1) setPlaying(false);
    }, 1400);
    return () => clearInterval(t);
  }, [playing, step]);
  const f = clerkFrames[step];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary">同一事件在两个收银员的视角</p>
        <PlayerBar
          playing={playing}
          onToggle={() => setPlaying(!playing)}
          onReset={() => { setStep(0); setPlaying(false); }}
          step={step}
          total={clerkFrames.length}
        />
      </div>
      {/* 情景舞台 */}
      <div className="mt-4 rounded-xl bg-muted/60 p-4">
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
            🎟️ 车票窗口 · 库存只剩 <span className="font-mono">{f.seat ?? '…'}</span> 张
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: '售票员 A（左边窗口）', paw: f.aPaw, say: f.sayA, bg: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200' },
            { name: '售票员 B（右边窗口）', paw: f.bPaw, say: f.sayB, bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200' },
          ].map((c) => (
            <div key={c.name} className={`rounded-lg border p-4 ${c.bg ?? ''}`}>
              <p className="text-[10px] font-bold text-muted-foreground">{c.name}</p>
              <div className="mt-2 rounded-md bg-background/80 p-2.5 font-mono text-[11px]">
                看到的库存：<strong>{c.paw === null ? '——' : c.paw}</strong>
              </div>
              <p className="mt-2 min-h-9 text-[11px] leading-5 text-muted-foreground">
                {c.say || '（静默）'}
              </p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 rounded-lg bg-muted p-3 text-xs leading-6 text-muted-foreground">{f.note}</p>
      <p className="mt-2 text-[10px] text-muted-foreground">
        💡 这正是 Java 里 count++ 变成两件事的时候会发生什么——读和写之间随时会插进来另一个线程。
      </p>
    </div>
  );
}

/* ============================================================
 * TeaOrchestration：华罗庚统筹法烧水泡茶
 *   串行（等 8 分钟） vs 并行（等 6 分钟）——让学习者一眼看懂"等水开,你就去洗茶具"
 * ============================================================ */

type TeaEvent = { at: number; lane: '煮水' | '洗茶具' | '泡茶'; text: string; };

const serialEvents: TeaEvent[] = [
  { at: 0, lane: '煮水', text: '洗壶（1 分钟）' },
  { at: 1, lane: '煮水', text: '开始烧水（3 分钟）' },
  { at: 4, lane: '洗茶具', text: '洗茶具（2 分钟）' },
  { at: 6, lane: '泡茶', text: '泡茶（2 分钟）' },
];

const parallelEvents: TeaEvent[] = [
  { at: 0, lane: '煮水', text: '洗壶（1 分钟）' },
  { at: 1, lane: '煮水', text: '开始烧水（3 分钟，人离开）' },
  { at: 1, lane: '洗茶具', text: '同时洗茶具（2 分钟）' },
  { at: 3, lane: '洗茶具', text: '洗好了' },
  { at: 4, lane: '泡茶', text: '水开 +替补到齐，泡茶' },
];

export function TeaOrchestration() {
  const [variant, setVariant] = useState<'serial' | 'parallel'>('serial');
  const [tick, setTick] = useState(0); // 每个 idx 代表一兮钟
  const [playing, setPlaying] = useState(false);
  const events = variant === 'serial' ? serialEvents : parallelEvents;
  const totalMinutes = variant === 'serial' ? 8 : 6;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setTick((s) => Math.min(s + 1, totalMinutes)), 800);
    return () => clearInterval(t);
  }, [playing, totalMinutes]);

  const done = tick >= totalMinutes;

  const lanes: Record<TeaEvent['lane'], { label: string; emoji: string; color: string; bg: string }> = {
    煮水: { label: '烧水工', emoji: '🔥', color: 'text-orange-700 dark:text-orange-200', bg: 'bg-orange-100 dark:bg-orange-900/40' },
    洗茶具: { label: '洗茶具工', emoji: '🫧', color: 'text-emerald-700 dark:text-emerald-200', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
    泡茶: { label: '泡茶', emoji: '🍵', color: 'text-violet-700 dark:text-violet-200', bg: 'bg-violet-100 dark:bg-violet-900/40' },
  };

  const minutePct = (m: number) => (m / totalMinutes) * 100;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg bg-muted p-1 text-xs">
          {(['serial', 'parallel'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setVariant(m); setTick(0); setPlaying(false); }}
              className={`rounded-md px-3 py-1.5 font-medium transition ${variant === m ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              {m === 'serial' ? '串行（8 分钟）' : '并行统筹（6 分钟）'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setPlaying(!playing)}>
            {playing ? <Pause /> : <Play />} {playing ? '暂停' : '播放'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setTick(0); setPlaying(false); }}>
            <RotateCcw /> 重来
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {(['煮水', '洗茶具', '泡茶'] as const).map((lane) => (
          <div key={lane} className="rounded-lg border border-border bg-background/50 p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span>{lanes[lane].emoji}</span>
              <span>{lanes[lane].label}</span>
            </div>
            <div className="relative mt-2 h-8 rounded-md bg-muted">
              {/* 时间刻度 */}
              {Array.from({ length: totalMinutes + 1 }, (_, i) => (
                <span key={i} className="absolute top-1 text-[9px] text-muted-foreground" style={{ left: `${(i / totalMinutes) * 100}%` }}>
                  {i}分
                </span>
              ))}
              {events.filter((ev) => ev.lane === lane).map((ev) => {
                const startM = ev.at;
                const endM = lane === '泡茶'
                  ? (variant === 'serial' ? 8 : 6)
                  : lane === '洗茶具' ? startM + 2 : lane === '煮水' && ev.text.includes('烧水') ? startM + 3 : startM + 1;
                const isLive = tick > startM;
                const width = Math.max(0, Math.min(tick, endM) - startM);
                return (
                  <div
                    key={ev.text}
                    className={`absolute top-4 h-4 rounded-sm px-1.5 text-[10px] leading-4 font-medium transition-all ${lanes[lane].bg} ${lanes[lane].color}`}
                    style={{ left: `${minutePct(startM)}%`, width: `${minutePct(endM) - minutePct(startM)}%`, opacity: isLive ? 1 : 0.25 }}
                  >
                    {isLive && width > 0 ? ev.text : ''}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[10px]">已过：{tick} / {totalMinutes} 分钟</span>
        <span className="text-muted-foreground">
          {variant === 'parallel' && tick >= 4 && !done ? '洗茶具是在烧水"别人在等"的那 3 分钟里完成的——等的时间干别的。' : ''}
          {done ? '全流程完成。两种方式喝到的茶一模一样，但统筹并行省下了 2 分钟——并发就此减少总耗时。' : ''}
        </span>
      </div>
    </div>
  );
}



const coreFrames = [
  {
    mode: 'single-core' as const,
    frame: 0,
    cores: [['A', null], ['B', null]],
    note: '单核是时段播出：这个核里装的是谁，它就在换装。并发不意味着对外看到的一切都是同步进行的。',
  },
  {
    mode: 'single-core' as const,
    frame: 0,
    cores: [['A', 'B', 'A', 'B', 'A', 'B']],
    note: '两个任务的一条单核时间线吧。',
  },
  {
    mode: 'multi-core' as const,
    frame: 0,
    cores: [['A', 'A', 'A', 'A'], ['B', 'B', 'B', 'B']],
    note: '多核：A 和 B 分占两个核同时运行——看它们这是并行的样子：不占等待不多支出。',
  },
];

export function CpuLanes() {
  const [playing, setPlaying] = useState(false);
  const [pair, setPair] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setPair((s) => (s + 1) % coreFrames.length), 1400);
    return () => clearInterval(t);
  }, [playing]);
  const f = coreFrames[pair];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary">并发做一切 vs 并行做一切</p>
        <PlayerBar playing={playing} onToggle={() => setPlaying(!playing)} onReset={() => setPair(0)} step={pair} total={coreFrames.length} />
      </div>
      <div className="mt-4 space-y-2">
        {f.cores.map((core, i) => (
          <div key={i} className="rounded-lg border border-border p-3">
            <p className="text-[10px] font-bold text-muted-foreground">核 {i + 1}</p>
            <div className="mt-2 flex gap-1">
              {core.map((c, j) => (
                <div key={j} className={`flex-1 rounded-sm py-2 text-center font-mono text-[10px] ${c === 'A' ? 'bg-sky-200 text-sky-900 dark:bg-sky-800 dark:text-sky-100' : c === 'B' ? 'bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-100' : 'bg-muted text-muted-foreground'}`}>
                  {c ?? 'idle'}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-lg bg-muted p-3 text-xs leading-6 text-muted-foreground">{f.note}</p>
    </div>
  );
}

/* ============================================================
 * RaceCounter：两个线程对同一个变量 ++，画出肉眼可见的丢失更新
 * ============================================================ */
const raceFrames = [
  // { a: A 接下来读的值, b: B 接下来读的值, store: 主存 }, 逐帧
  { store: 0, aValue: null as number | null, bValue: null as number | null, aHas: false, bHas: false, log: '双方都看到 0' },
  { store: 0, aValue: 0, bValue: null, aHas: true, bHas: false, log: 'A 读出 0，准备 +1' },
  { store: 0, aValue: 0, bValue: 0, aHas: true, bHas: true, log: 'B 也读出了 0——这就是丢失更新的交界处' },
  { store: 1, aValue: 0, bValue: 0, aHas: true, bHas: true, log: 'A 写回 1' },
  { store: 1, aValue: null, bValue: 1, aHas: false, bHas: true, log: 'B 写回 1（并非 2），A 的那一次白算了' },
  { store: 2, aValue: 1, bValue: null, aHas: true, bHas: false, log: 'A 再读 1、写回 2' },
  { store: 2, aValue: 1, bValue: 1, aHas: true, bHas: true, log: 'B 又读了一遍 1…结果不变' },
  { store: 3, aValue: null, bValue: null, aHas: false, bHas: false, log: '理想应是 4；实际是 3。少了一次。' },
];

export function RaceCounterDemo() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const total = raceFrames.length;
  useTicker(playing, 900);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (step < total - 1) setStep(step + 1);
      else setPlaying(false);
    }, 900);
    return () => clearTimeout(t);
  }, [playing, step, total]);

  const f = raceFrames[step];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary">丢失更新：眼见为实</p>
        <PlayerBar
          playing={playing}
          onToggle={() => setPlaying(!playing)}
          onReset={() => { setStep(0); setPlaying(false); }}
          step={step}
          total={total}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 items-start gap-3 text-center text-[11px]">
        {['A', 'B'].map((who) => {
          const value = who === 'A' ? f.aValue : f.bValue;
          const has = who === 'A' ? f.aHas : f.bHas;
          return (
            <div key={who} className="rounded-lg border border-border p-3">
              <p className="font-mono text-xs">{who}</p>
              <div className={`mx-auto mt-2 grid size-11 place-items-center rounded-full border-2 transition-colors ${has ? 'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-900/30' : 'border-dashed border-border text-muted-foreground'}`}>
                {has ? `i = ${value}` : '…'}
              </div>
              <p className="mt-2 leading-4 text-muted-foreground">
                {has ? '手里攥着一份' : '手里为空'}
              </p>
            </div>
          );
        })}
        <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3">
          <p className="font-mono text-xs">主内存</p>
          <div className="mx-auto mt-2 grid size-11 place-items-center rounded-full bg-primary text-base font-bold text-primary-foreground transition-transform">
            {f.store}
          </div>
          <p className="mt-2 leading-4 text-muted-foreground">唯一权威</p>
        </div>
      </div>
      <p className="mt-4 min-h-11 rounded-lg bg-muted p-3 text-xs leading-6 text-muted-foreground">{f.log}</p>
    </div>
  );
}

/* ============================================================
 * MemoryLanes：主存 vs 线程工作内存，解释"为什么可能看见旧值"
 * ============================================================ */
export function MemoryLanes() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frames = useMemo(() => [
    { t: '主内存', main: { flag: true }, t1: { cached: true, reads: null }, t2: { cached: true, reads: null }, note: '所有线程都看着主内存同一个变量' },
    { t: 'A 读了 flag', main: { flag: true }, t1: { cached: true, reads: 'flag = true' }, t2: { cached: false, reads: null }, note: 'A 在循环里反复复用寄存器中的 flag——认为新值不存在' },
    { t: 'B 更新 flag', main: { flag: false }, t1: { cached: true, reads: 'flag = true' }, t2: { cached: true, reads: 'flag = false' }, note: 'B 写了主存，但 A 的缓存没有失效;它读的是自己的旧拷贝' },
    { t: 'sync/锁 发生', main: { flag: false }, t1: { cached: null, reads: 'flag = false' }, t2: { cached: true, reads: 'flag = false' }, note: '一次锁/volatile 行至，建立 happens-before——A 这次读到了新值' },
  ], []);
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (step < frames.length - 1) setStep(step + 1); else setPlaying(false);
    }, 1100);
    return () => clearTimeout(t);
  }, [playing, step, frames.length]);

  const f = frames[step];
  const cell = (bg: string, rows: [string, string][]) => (
    <div className={`rounded-lg border p-3 ${bg}`}>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 py-0.5 font-mono text-[11px]">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-semibold">{v}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary">可见性：不是慢，是没同步</p>
        <PlayerBar playing={playing} onToggle={() => setPlaying(!playing)}
          onReset={() => { setStep(0); setPlaying(false); }} step={step} total={frames.length} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {cell('bg-amber-50 dark:bg-amber-950/25 border-amber-200/60 dark:border-amber-500/25', [['A 的 CPU 缓存（编译器/硬件）', ''], ['flag', String(f.t1.cached)], ['A 看到', f.t1.reads ?? '—']])}
        {cell('bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-500/25', [['B 写 flag', ''], ['主内存', String(f.main.flag)], ['B 看到', f.t2.reads ?? '—']])}
        {cell('bg-sky-50 dark:bg-sky-950/25 border-sky-200/60 dark:border-sky-500/25', [['主内存（共享）', ''], ['flag', String(f.main.flag)], ['做这次写的人会刷', '']])}
      </div>
      <p className="mt-4 min-h-11 rounded-lg bg-muted p-3 text-xs leading-6 text-muted-foreground">{f.note}</p>
    </div>
  );
}

/* ============================================================
 * QueueLane：生产者放消息、消费者 wait …… notify！ 的连续动画
 * ============================================================ */
const queueFrames = [
  { slot: null as string | null, prod: 'RUNNABLE', cons: 'WAITING', consStats: '队列是空，先睡下', prodStats: '准备放消息', log: 'consumer 已经开始等，锁已被让出' },
  { slot: null, prod: '进临界区', cons: 'WAITING', consStats: '没问题，先睡', prodStats: 'put + notify', log: 'producer 在锁内放消息并叫醒所有人' },
  { slot: 'msg-1', prod: '完成出锁', cons: 'BLOCKED', consStats: '从条件队列回锁队列', prodStats: '——离开', log: 'notify 后消费者先等锁，再拿到锁才能动' },
  { slot: 'msg-1', prod: '完成出锁', cons: 'RUNNABLE', consStats: '拿到锁：先验再取', prodStats: '……走人了', log: '消费完成' },
  { slot: null, prod: '结束', cons: 'WAITING', consStats: '又空了，回到 while 里重新等', prodStats: '……', log: '线程进入下一轮 while + wait' },
];

export function QueueLane() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (step < queueFrames.length - 1) setStep(step + 1); else if (step === queueFrames.length - 1) { /* loop */ setStep(0); }
    }, 1200);
    return () => clearTimeout(t);
  }, [playing, step]);
  const f = queueFrames[step];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary">两个队列各谁在等</p>
        <PlayerBar playing={playing} onToggle={() => setPlaying(!playing)}
          onReset={() => setStep(0)} step={step} total={queueFrames.length} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-[10px] font-bold text-muted-foreground">锁队列（期待拿监测）</p>
          <div className="mt-3 rounded-md bg-muted p-3 font-mono text-[11px]">
            {f.cons === 'BLOCKED' ? 'consumer 在这儿等锁' : '空'}
          </div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-[10px] font-bold text-muted-foreground">条件队列（等着被叫醒）</p>
          <div className="mt-3 rounded-md bg-muted p-3 font-mono text-[11px]">
            {f.cons === 'WAITING' ? 'consumer 在这儿睡' : '空'}
          </div>
        </div>
        <div className="rounded-lg border border-amber-200/70 bg-amber-50/60 p-3 dark:border-amber-500/25 dark:bg-amber-950/25">
          <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200">共享区</p>
          <div className="mt-3 rounded-md bg-background p-3 font-mono text-[11px]">
            msg = {f.slot ?? 'null'}
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-muted p-3 text-xs font-semibold">{f.log}</div>
    </div>
  );
}

/* ============================================================
 * InterruptFlow：interrupt() 发消息前的流水线图
 * ============================================================ */
export function InterruptFlow() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frames = [
    { prod: '工作线程正在干活', cons: 'MAIN 还在继续', event: '阶段 1：打断发射', spikePos: 0, consP: 'RUNNABLE' },
    { prod: 'interrupt() 发来', cons: 'sleep 被打断', event: '阶段 2：sleep 抛 InterruptedException', spikePos: 1, consP: '被叫醒' },
    { prod: '任务还会走一段', cons: 'catch：恢复标记', event: '阶段 3：catch 里恢复标记', spikePos: 2, consP: '把标记抬回来' },
    { prod: '回到 while 条件检查', cons: '退出循环', event: '阶段 4：退出并终结', spikePos: 3, consP: 'TERMINATED' },
  ];
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (step < frames.length - 1) setStep(step + 1); else setPlaying(false);
    }, 1400);
    return () => clearTimeout(t);
  }, [playing, step, frames.length]);
  const f = frames[step];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary">中断一条命令的传导</p>
        <PlayerBar playing={playing} onToggle={() => setPlaying(!playing)}
          onReset={() => setStep(0)} step={step} total={frames.length} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {frames.map((s, i) => (
          <div key={i} className={`rounded-lg border p-3 text-center transition-all ${i === step ? 'border-primary bg-primary/10' : 'border-border'}`}>
            <p className="text-[10px] font-bold text-muted-foreground">第 {i + 1} 步</p>
            <p className="mt-1 text-[11px] leading-5">{s.event}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-muted p-3 text-xs leading-6">
        <p>
          <span className="font-semibold">工作线程动作：</span>
          {f.cons === '' ? '——' : f.cons}
        </p>
        <p>
          <span className="font-semibold">进入的状态：</span>
          {f.consP}
        </p>
      </div>
    </div>
  );
}
