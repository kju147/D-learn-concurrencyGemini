'use client';

// ScenePlayer v1.1：剧本式关卡播放器（精装版）
// 升档点：① 数据飞行筹码 ② 事件长河（可拖回任意一拍） ③ 镜头语言（聚焦/震动/事故红闪）
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clapperboard, Hand, Pause, Play, RotateCcw, Dices } from 'lucide-react';
import { Sim, rng } from '../../sim/engine';
import { getScene } from '../../sim/scenes';
import { getScreenplay, type Checkpoint, type Beat } from '../../sim/screenplay';

const COLORS: Record<string, { bar: string; soft: string; text: string; chip: string }> = {
  A: { bar: 'bg-sky-500', soft: 'bg-sky-50 border-sky-200', text: 'text-sky-800', chip: 'bg-sky-500' },
  B: { bar: 'bg-rose-500', soft: 'bg-rose-50 border-rose-200', text: 'text-rose-800', chip: 'bg-rose-500' },
};

function insLabel(i: { op: string; name?: string }): string {
  switch (i.op) {
    case 'load': return `getstatic ${i.name}  // 读主存`;
    case 'add': return 'iadd  // +1';
    case 'store': return `putstatic ${i.name}  // 写回主存`;
    case 'lock': return `monitorenter ${i.name}`;
    case 'unlock': return `monitorexit ${i.name}`;
    default: return i.op;
  }
}

type Flight = { key: number; thread: string; dir: 'load' | 'store'; value: number };

export default function ScenePlayer({ sceneKey, onFinale }: { sceneKey: string; onFinale?: (finalCounter: number) => void }) {
  const scene = useMemo(() => getScene(sceneKey), [sceneKey]);
  const play = useMemo(() => getScreenplay(sceneKey), [sceneKey]);
  const threadDefs = useMemo(() => scene.threads('A', 'B'), [scene]);

  const makeSim = () =>
    new Sim({ threads: threadDefs, mem: { ...scene.mem }, locks: scene.locks ? [...scene.locks] : undefined });

  // ── 状态 ────────────────────────────────────────────────
  const simRef = useRef<Sim>(makeSim());
  const picksRef = useRef<string[]>([]);           // 每拍选中的线程（回放/拖拽时间轴用）
  const randRef = useRef(rng(3));
  const firedCp = useRef<Set<number>>(new Set());
  const [, forceRender] = useState(0);

  const [seed, setSeed] = useState(3);
  const [mode, setMode] = useState<'theater' | 'takeover'>('theater');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [beat, setBeat] = useState<Beat>(() => play.narrate(null, makeSim().state, { label: (x) => x }));
  const [cp, setCp] = useState<Checkpoint | null>(null);
  const [cpAnswer, setCpAnswer] = useState<number | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [shock, setShock] = useState(0); // 事故震动计数器

  // 位置 ref：用于筹码飞行坐标
  const stageRef = useRef<HTMLDivElement>(null);
  const memRef = useRef<HTMLDivElement>(null);
  const chipRegRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sim = simRef.current;
  const totalIns = threadDefs.reduce((n, t) => n + t.ins.length, 0);
  const counter = sim.state.mem.counter ?? 0;

  function flightFor(thread: string, dir: 'load' | 'store', value: number): Flight | null {
    return { key: sim.events.length, thread, dir, value };
  }

  function present() {
    const ev = sim.events[sim.events.length - 1] ?? null;
    setBeat(play.narrate(ev, sim.state, { label: (x) => x }));
    if (ev) {
      if (ev.ins.op === 'load') setFlight(flightFor(ev.thread, 'load', ev.regs[ev.thread] ?? 0));
      else if (ev.ins.op === 'store') setFlight(flightFor(ev.thread, 'store', ev.mem.counter));
      if (ev.violated) setShock((s) => s + 1);
    }
    forceRender((x) => x + 1);
  }

  function stepOnce(picked: string) {
    const ev = sim.step(picked);
    if (!ev) return;
    picksRef.current.push(picked);
    present();
    if (play.checkpoint && !firedCp.current.has(ev.seq)) {
      const c = play.checkpoint(ev, sim.state);
      if (c) { firedCp.current.add(ev.seq); setCp(c); setCpAnswer(null); setPlaying(false); return; }
    }
    if (sim.state.done) {
      const finalCounter = sim.state.mem.counter ?? 0;
      setBeat(play.finale(finalCounter));
      if (finalCounter !== 2 && sceneKey === 'lost-update') setShock((s) => s + 1);
      setPlaying(false);
      onFinale?.(finalCounter);
    }
  }

  /** 拖回任意一拍：重建现场（确定性回放 picks 前缀） */
  function scrubTo(seq: number) {
    const picks = picksRef.current.slice(0, seq + 1);
    simRef.current = makeSim();
    for (const p of picks) simRef.current.step(p);
    picksRef.current = picks;
    setPlaying(false);
    setFlight(null);
    present();
  }

  /** 自动调度：排除正在等锁的线程（BLOCKED 不该被调度空转） */
  function autoPick(): string | null {
    const live = sim.runnable().filter((id) => {
      const t = threadDefs.find((x) => x.id === id)!;
      const ins = t.ins[sim.state.pcs[id]];
      if (ins.op === 'lock') {
        const holder = sim.state.locks[ins.name];
        if (holder != null && holder !== id) return false;
      }
      return true;
    });
    if (live.length === 0) return null;
    return live[Math.floor(randRef.current() * live.length)];
  }

  useEffect(() => {
    if (!playing || mode !== 'theater' || cp) return;
    const t = setTimeout(() => {
      const pick = autoPick();
      if (pick == null) { setPlaying(false); return; }
      stepOnce(pick);
    }, (beat.holdMs ?? 1400) / speed);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, mode, beat, cp, speed, sim.events.length]);

  function reset(newSeed?: number) {
    const s = newSeed ?? seed;
    randRef.current = rng(s);
    firedCp.current = new Set();
    picksRef.current = [];
    simRef.current = makeSim();
    setCp(null); setCpAnswer(null); setFlight(null);
    setPlaying(false);
    setBeat(play.narrate(null, simRef.current.state, { label: (x) => x }));
    forceRender((x) => x + 1);
  }

  // 筹码飞行起止坐标（相对舞台容器）
  function flightCoords(): { from: { x: number; y: number }; to: { x: number; y: number } } | null {
    if (!flight || !stageRef.current || !memRef.current) return null;
    const s = stageRef.current.getBoundingClientRect();
    const mem = memRef.current.getBoundingClientRect();
    const reg = chipRegRefs.current[flight.thread]?.getBoundingClientRect();
    if (!reg) return null;
    const mc = { x: mem.left - s.left + mem.width / 2, y: mem.top - s.top + mem.height / 2 };
    const rc = { x: reg.left - s.left + reg.width / 2, y: reg.top - s.top + reg.height / 2 };
    return flight.dir === 'load' ? { from: mc, to: rc } : { from: rc, to: mc };
  }
  const coords = flightCoords();

  return (
    <div ref={stageRef} className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white not-prose">
      {/* 控制条 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700">
          <Clapperboard className="size-4 text-teal-700" /> {scene.title}
        </span>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-[10px] text-stone-500">seed #{seed}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {mode === 'theater' ? (
            <>
              <button onClick={() => setPlaying(!playing)}
                className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800">
                {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}{playing ? '暂停' : sim.events.length ? '继续' : '放映'}
              </button>
              {[0.7, 1, 1.5].map((v) => (
                <button key={v} onClick={() => setSpeed(v)}
                  className={`rounded-md px-2 py-1.5 text-[10px] font-mono ${speed === v ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>{v}×</button>
              ))}
              <button onClick={() => { setMode('takeover'); setPlaying(false); }} disabled={sim.state.done}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-40">
                <Hand className="size-3.5" /> 我来试试
              </button>
            </>
          ) : (
            <button onClick={() => setMode('theater')}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600">
              <Clapperboard className="size-3.5" /> 接管中…点我回剧场（接着演）
            </button>
          )}
          <button onClick={() => reset(seed + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50">
            <Dices className="size-3.5" /> 换个事故
          </button>
          <button onClick={() => reset()} className="rounded-lg border border-stone-300 p-1.5 text-stone-600 hover:bg-stone-50">
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>

      {/* 舞台（事故时整台震动+红边闪烁） */}
      <motion.div
        key={'fp' + String(shock)}
        animate={shock ? { x: [0, -7, 7, -5, 5, -2, 0] } : undefined}
        transition={{ duration: 0.45 }}
        className={shock && sceneKey === 'lost-update' && sim.state.done ? 'ring-2 ring-rose-400/70 rounded-b-none' : ''}>
        <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_1fr]">
          {threadDefs.map((t) => {
            const c = COLORS[t.id];
            const pc = sim.state.pcs[t.id];
            const reg = sim.state.regs[t.id];
            const exhausted = pc >= t.ins.length;
            const focused = beat.focus === t.id || beat.focus === 'all';
            const clickable = mode === 'takeover' && !exhausted && !sim.state.done;
            return (
              <motion.button key={t.id} onClick={() => clickable && stepOnce(t.id)} disabled={!clickable}
                animate={{ scale: focused ? 1 : 0.98, opacity: focused ? 1 : 0.72 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className={`relative rounded-xl border p-3 text-left transition-shadow ${c.soft} ${clickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold ${c.text}`}>线程 {t.label}</p>
                  <span className="font-mono text-[10px] text-stone-400">{exhausted ? 'TERMINATED' : 'RUNNABLE'}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {t.ins.map((i, k) => (
                    <p key={k} className={`truncate rounded px-1.5 py-0.5 font-mono text-[11px] transition ${
                      k === pc ? `${c.bar} text-white shadow` : k < pc ? 'text-stone-400 line-through' : 'text-stone-600'}`}>
                      {insLabel(i)}
                    </p>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-stone-500">
                  工作内存拿着：
                  <div ref={(el) => { chipRegRefs.current[t.id] = el; }}
                    className="grid size-7 place-items-center rounded-md bg-white font-mono font-bold text-stone-800 shadow-sm">
                    <AnimatePresence mode="popLayout">
                      <motion.span key={String(reg)} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }}>
                        {reg ?? '—'}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.button>
            );
          })}

          <div ref={memRef} className="flex flex-col items-center justify-center gap-2 self-stretch rounded-xl border-2 bg-teal-50/50 px-5 py-3"
            style={{ borderColor: beat.focus === 'mem' ? '#0d9488' : '#99f6e4' }}>
            <p className="text-[10px] font-bold text-teal-800">主内存（共享）</p>
            <motion.div key={String(counter)} initial={{ scale: 1.5 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="grid size-12 place-items-center rounded-full bg-teal-700 font-mono text-lg font-bold text-white">
              {counter}
            </motion.div>
            <p className="font-mono text-[10px] text-teal-800/70">counter</p>
            {scene.locks && (
              <p className="text-[10px] text-stone-500">🔒 room：<span className="font-mono">{sim.state.locks['room'] ?? '空闲'}</span></p>
            )}
          </div>
        </div>
      </motion.div>

      {/* 数据飞行筹码 */}
      {coords && flight && (
        <motion.div
          key={flight.key}
          initial={{ x: coords.from.x - 14, y: coords.from.y - 14, opacity: 0, scale: 0.6 }}
          animate={{ x: coords.to.x - 14, y: coords.to.y - 14, opacity: [0, 1, 1, 0], scale: [0.6, 1.15, 1, 0.9] }}
          transition={{ duration: 0.55 / speed, ease: 'easeInOut' }}
          onAnimationComplete={() => setFlight(null)}
          className="pointer-events-none absolute z-20 grid size-7 place-items-center rounded-full bg-amber-400 font-mono text-xs font-bold text-amber-950 shadow-lg ring-2 ring-amber-200">
          {flight.value}
        </motion.div>
      )}

      {/* 旁白字幕条 */}
      <div className="mx-4 mb-1 min-h-11 rounded-xl bg-stone-900 px-4 py-3">
        <AnimatePresence mode="wait">
          <motion.p key={beat.narration} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="text-[13px] leading-6 text-stone-100">
            {beat.narration}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* 事件长河：每拍一枚棋子，点任意棋子拖回现场 */}
      <div className="mx-4 mb-3 mt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {sim.events.map((ev, i) => {
            const active = i === sim.events.length - 1;
            return (
              <button key={i} onClick={() => scrubTo(i)} title={`${ev.thread} · ${insLabel(ev.ins)}`}
                className={`group flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 font-mono text-[9px] transition
                  ${ev.violated ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : ev.thread === 'A' ? 'border-sky-200 bg-sky-50 text-sky-700'
                    : 'border-rose-200 bg-rose-50 text-rose-600'}
                  ${active ? 'ring-2 ring-stone-400' : 'hover:border-stone-400'}`}>
                {ev.thread}.{ev.ins.op}
              </button>
            );
          })}
          {sim.events.length === 0 && <span className="text-[10px] text-stone-400">放映后，这里会落下一排棋子；点任意棋子回到那一拍。</span>}
        </div>
      </div>

      {mode === 'takeover' && !sim.state.done && (
        <p className="mx-4 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          🎮 你已接管调度器——点任意线程卡片让它执行下一条指令。试试在 A 写回之前切给 B。
        </p>
      )}

      {/* 关卡提问 */}
      <AnimatePresence>
        {cp && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-stone-100 bg-stone-50">
            <div className="p-4">
              <p className="text-xs font-bold text-stone-800">⏸ 关卡暂停 · 先答再放</p>
              <p className="mt-1 text-sm font-medium">{cp.question}</p>
              <div className="mt-3 space-y-2">
                {cp.options.map((o, i) => {
                  const answered = cpAnswer !== null;
                  const picked = cpAnswer === i;
                  return (
                    <button key={i} disabled={answered} onClick={() => setCpAnswer(i)}
                      className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                        answered && o.correct ? 'border-teal-500 bg-teal-50 text-teal-900'
                        : picked && !o.correct ? 'border-rose-400 bg-rose-50 text-rose-900'
                        : 'border-stone-200 bg-white hover:border-stone-400'}`}>
                      {o.label}
                      {answered && (picked || o.correct) && <span className="mt-1 block text-xs leading-5 opacity-80">{o.why}</span>}
                    </button>
                  );
                })}
              </div>
              {cpAnswer !== null && (
                <button onClick={() => { setCp(null); setPlaying(true); }}
                  className="mt-3 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800">
                  继续放映，验证你的预测 →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
