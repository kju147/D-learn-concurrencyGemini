// SchedulerSim：确定性线程调度模拟器（动画引擎 v2 的底座）
// 设计约束：
//  1. 动画 = 真实跑出来的事件流，不是画出来的帧
//  2. 同一脚本 + 同一 seed ⇒ 同一事件流（可回放、可分享）
//  3. 支持"探索模式"：UI 在每个交错点自己选让哪个线程跑
//  4. 所有共享内存效果（可见性/锁）通过指令集表达，场景脚本只是数据

export type Ins =
  | { op: 'load'; name: string }                    // 读共享变量到本线程寄存器
  | { op: 'add'; delta: number }                    // 寄存器 += delta
  | { op: 'store'; name: string }                   // 寄存器写回共享变量
  | { op: 'cas'; name: string; expect: 'reg'; value: 'reg' }  // 见 scenes 中 CAS 场景
  | { op: 'lock'; name: string }                    // 获取锁（独占）
  | { op: 'unlock'; name: string }                  // 释放锁
  | { op: 'say'; text: string };                    // 旁白（不产生内存效果）

export type ThreadDef = { id: string; label: string; ins: Ins[] };

export type SimEvent = {
  seq: number;
  thread: string;
  ins: Ins;
  mem: Record<string, number>;
  regs: Record<string, number | null>;
  locks: Record<string, string | null>;
  /** 本次执行是否发生了"坏结局"标记（场景自定义） */
  violated?: string;
};

export type SimState = {
  mem: Record<string, number>;
  regs: Record<string, number | null>;
  pcs: Record<string, number>;
  locks: Record<string, string | null>;
  done: boolean;
};

/** mulberry32 确定性 PRNG */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Sim {
  private threads: ThreadDef[];
  private lockNames: string[];
  public state: SimState;
  public events: SimEvent[] = [];

  constructor(opts: {
    threads: ThreadDef[];
    mem: Record<string, number>;
    locks?: string[];
    /** 不变量检查：每次事件后调用，返回违规描述（null=OK） */
    invariant?: (s: SimState) => string | null;
  }) {
    this.threads = opts.threads;
    this.lockNames = opts.locks ?? [];
    this.invariant = opts.invariant;
    this.state = {
      mem: { ...opts.mem },
      regs: Object.fromEntries(opts.threads.map((t) => [t.id, null])),
      pcs: Object.fromEntries(opts.threads.map((t) => [t.id, 0])),
      locks: Object.fromEntries(this.lockNames.map((n) => [n, null])),
      done: false,
    };
  }

  private invariant?: (s: SimState) => string | null;

  /** 当前可运行的线程（还有指令未执行完） */
  runnable(): string[] {
    return this.threads
      .filter((t) => this.state.pcs[t.id] < t.ins.length)
      .map((t) => t.id);
  }

  /** 前进一步。threadId 缺省时由调用方给定（UI 控制），此时必须存在于 runnable */
  step(threadId: string): SimEvent | null {
    if (this.state.done) return null;
    const th = this.threads.find((t) => t.id === threadId);
    if (!th) throw new Error(`unknown thread ${threadId}`);
    const pc = this.state.pcs[threadId];
    if (pc >= th.ins.length) return null;
    const ins = th.ins[pc];
    const { mem, regs, locks } = this.state;
    let violated: string | undefined;

    switch (ins.op) {
      case 'load': regs[threadId] = mem[ins.name]; break;
      case 'add': regs[threadId] = (regs[threadId] ?? 0) + ins.delta; break;
      case 'store': mem[ins.name] = regs[threadId] ?? 0; break;
      case 'lock':
        if (locks[ins.name] != null && locks[ins.name] !== threadId) {
          // 互斥语义直接在模拟器里体现：拿不到就原地等待（本次步进作废）
          this.events.push(this.mk(threadId, ins, 'blocked：锁被 ' + locks[ins.name] + ' 持有，本线程 BLOCKED'));
          return this.events[this.events.length - 1];
        }
        locks[ins.name] = threadId;
        break;
      case 'unlock': if (locks[ins.name] === threadId) locks[ins.name] = null; break;
      case 'cas': {
        const cur = mem[ins.name];
        const v = regs[threadId] ?? 0;
        if (cur === v) { mem[ins.name] = v; this.note = 'cas 成功'; }
        else { this.note = `cas 失败：期望 ${v}，实际 ${cur}，需重试`; }
        break;
      }
      case 'say': break;
    }

    this.state.pcs[threadId] = pc + 1;
    if (this.invariant) violated = this.invariant(this.state) ?? undefined;
    const ev = this.mk(threadId, ins, violated);
    this.events.push(ev);
    if (this.runnable().length === 0) this.state.done = true;
    return ev;
  }

  private note?: string;
  private mk(thread: string, ins: Ins, violated?: string): SimEvent {
    return {
      seq: this.events.length,
      thread, ins,
      mem: { ...this.state.mem },
      regs: { ...this.state.regs },
      locks: { ...this.state.locks },
      violated,
    };
  }

  /** 自动跑到底：seed 决定每次交错时选中哪个线程。量子数 1-3 条指令（模拟时间片） */
  run(seed: number): SimEvent[] {
    const rand = rng(seed);
    while (!this.state.done) {
      const live = this.runnable();
      if (live.length === 0) break;
      // 从当前持有锁思路出发：尽量让当前线程把临界区跑完一半概率，增加真实感
      const pick = live[Math.floor(rand() * live.length)];
      const quantum = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < quantum && !this.state.done; i++) {
        if (this.state.pcs[pick] >= this.threads.find((t) => t.id === pick)!.ins.length) break;
        this.step(pick);
      }
    }
    return this.events;
  }
}
