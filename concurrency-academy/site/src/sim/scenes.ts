// 场景脚本库：一个场景 = 一组线程定义 + 初始内存 + 不变量
import type { Ins, ThreadDef } from './engine';

export type SceneDef = {
  key: string;
  title: string;
  /** 想讲清的问题 */
  question: string;
  mem: Record<string, number>;
  locks?: string[];
  threads: (id: string, label: string) => ThreadDef[];
  expected?: string;
};

const inc = (counter = 'counter'): Ins[] => [
  { op: 'load', name: counter },
  { op: 'add', delta: 1 },
  { op: 'store', name: counter },
];

export const scenes: Record<string, SceneDef> = {
  'lost-update': {
    key: 'lost-update',
    title: '丢失更新：count++ 不是一步',
    question: '两个线程各执行一次 counter++，counter 一定是 2 吗？',
    mem: { counter: 0 },
    threads: (a, b) => [
      { id: a, label: a, ins: [...inc()] },
      { id: b, label: b, ins: [...inc()] },
    ],
    expected: '理想结局 counter=2；若交错恰好在 load 与 store 之间，实际=1（丢了一次更新）',
  },
  'lost-update-guarded': {
    key: 'lost-update-guarded',
    title: '对照组：synchronized 保护后的同一脚本',
    question: '加上互斥锁后，同样的交错还会丢更新吗？',
    mem: { counter: 0 },
    locks: ['room'],
    threads: (a, b) => [
      { id: a, label: a, ins: [{ op: 'lock', name: 'room' }, ...inc(), { op: 'unlock', name: 'room' }] },
      { id: b, label: b, ins: [{ op: 'lock', name: 'room' }, ...inc(), { op: 'unlock', name: 'room' }] },
    ],
    expected: '任何交错下 counter 都是 2；锁的持有者在临界区内被切换也不丢锁',
  },
};

export function listScenes() { return Object.values(scenes); }
export function getScene(key: string) { return scenes[key]; }
