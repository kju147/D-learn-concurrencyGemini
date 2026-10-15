// 剧本层：把模拟器事件流变成"可放映的电影"
// 一个场景剧本 = 事件 → 旁白/镜头的映射 + 关卡点判定
import type { SimEvent, SimState } from './engine';

export type Beat = {
  /** 字幕/旁白 */
  narration: string;
  /** 镜头聚焦：线程 A / 线程 B / 主存 / 全体 */
  focus: 'A' | 'B' | 'mem' | 'all';
  /** 本拍停留时长（ms），越关键越长 */
  holdMs?: number;
};

export type Checkpoint = {
  /** 暂停时的提问 */
  question: string;
  options: { label: string; correct: boolean; why: string }[];
};

export type Screenplay = {
  narrate: (ev: SimEvent | null, state: SimState, ctx: { label: (id: string) => string }) => Beat;
  /** 返回非 null 表示该事件后要暂停提问（每个 checkpoint 只触发一次，由播放器去重） */
  checkpoint?: (ev: SimEvent, state: SimState) => Checkpoint | null;
  /** 终拍：根据结局给收拢旁白 */
  finale: (finalCounter: number) => Beat;
};

export type SceneKey = string;

const ME: Record<SceneKey, Screenplay> = {
  'lost-update': {
    narrate(ev, state, { label }) {
      if (!ev) {
        return {
          focus: 'all',
          narration: '两个线程，各做一件事：把 counter 加 1。counter 初始为 0。看起来天经地义——ещё看下去。',
          holdMs: 2200,
        };
      }
      const who = label(ev.thread);
      switch (ev.ins.op) {
        case 'load':
          return { focus: ev.thread as 'A' | 'B', narration: `${who} 从主存读出 counter 的当前值——它看到的是 ${ev.regs[ev.thread]}。`, holdMs: 1600 };
        case 'add':
          return { focus: ev.thread as 'A' | 'B', narration: `${who} 在自己手里算好了：${(ev.regs[ev.thread] ?? 0)}。注意，这一步主存还没变。`, holdMs: 1600 };
        case 'store':
          return {
            focus: 'mem',
            narration: `${who} 把结果写回主存。counter 现在是 ${ev.mem.counter}。${ev.violated ? '⚠️ 等等——这个数字对不上。' : ''}`,
            holdMs: 1800,
          };
        case 'lock':
          return { focus: ev.thread as 'A' | 'B', narration: ev.violated ?? `${who} 拿到了锁 room，进入临界区。`, holdMs: 1500 };
        case 'unlock':
          return { focus: 'mem', narration: `${who} 释放锁。`, holdMs: 1200 };
        default:
          return { focus: 'all', narration: '……', holdMs: 1200 };
      }
    },
    checkpoint(ev, state) {
      // 神来之笔的暂停点：两个线程都读过了、都还没写回
      if (state.regs.A != null && state.regs.B != null && state.mem.counter === 0) {
        return {
          question: '现在 A 和 B 手里都攥着 0，都准备写回 1。你预测：全部做完后 counter 是几？',
          options: [
            { label: '2 —— 各加 1 嘛', correct: false, why: '这是直觉，但直觉在这里会翻车。继续看。' },
            { label: '1 —— 有一次算白干了', correct: true, why: '对了。两个线程看到的都是 0，写回的都只会是 1：一次更新被碾丢了。' },
            { label: '不一定，看运气', correct: false, why: '这次已经定死了：剩下的动作只剩两次写回，结局只剩 1。（换一个交错才是真随机）' },
          ],
        };
      }
      return null;
    },
    finale(counter) {
      return counter === 2
        ? { focus: 'mem', narration: '本次结局：counter = 2。这次调度运气好没出事——但并发代码不能有"运气好"这种词。给我点「换个事故」。', holdMs: 2600 }
        : { focus: 'mem', narration: `本次结局：counter = ${counter}。事故成立：期望 2 实际 ${counter}。这就是丢失更新——不是玄学，是 load 与 store 之间被插了队。🎬 点「我来试试」你可以亲手重演这条调度路径。`, holdMs: 2800 };
    },
  },

  'lost-update-guarded': {
    narrate(ev, state, { label }) {
      if (!ev) return { focus: 'all', narration: '同样的剧本，这次每个线程进临界区前先拿锁。盯住那把 room 锁。', holdMs: 2200 };
      const who = label(ev.thread);
      if (ev.ins.op === 'lock') {
        return ev.violated
          ? { focus: ev.thread as 'A' | 'B', narration: `🔒 ${ev.violated}`, holdMs: 1800 }
          : { focus: ev.thread as 'A' | 'B', narration: `${who} 拿到锁，独占临界区。`, holdMs: 1500 };
      }
      if (ev.ins.op === 'unlock') return { focus: 'mem', narration: `${who} 干完活走出房间，锁被释放。`, holdMs: 1300 };
      if (ev.ins.op === 'load') return { focus: ev.thread as 'A' | 'B', narration: `${who}（锁内）读 counter = ${ev.regs[ev.thread]}。`, holdMs: 1400 };
      if (ev.ins.op === 'add') return { focus: ev.thread as 'A' | 'B', narration: `${who} 算出 ${ev.regs[ev.thread]}。`, holdMs: 1300 };
      if (ev.ins.op === 'store') return { focus: 'mem', narration: `${who}（锁内）写回：counter = ${ev.mem.counter}。`, holdMs: 1500 };
      return { focus: 'all', narration: '……', holdMs: 1200 };
    },
    finale() {
      return { focus: 'mem', narration: '结局锁死在 2。任何交错都一样：临界区对外不可分割。刚才那次"事故调度"，在锁面前碰了壁——锁不是性能税，是正确性的保镖。', holdMs: 2800 };
    },
  },
};

export function getScreenplay(key: SceneKey): Screenplay {
  const p = ME[key];
  if (!p) throw new Error(`no screenplay for ${key}`);
  return p;
}
