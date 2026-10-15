// B1 课程注册表：module:lesson → 内容组件
import type { LessonComponent, LessonMeta } from '@/components/lesson/lesson-page';
import intuitionWhy from './intuition-why';
import intuitionThreads from './intuition-threads';
import intuitionParallelism from './intuition-parallelism';
import intuitionCpuIo from './intuition-cpu-io';
import threadsLifecycle from './threads-lifecycle';
import threadsInterrupt from './threads-interrupt';
import threadsWaitNotify from './threads-wait-notify';
import threadsPark from './threads-park';
import threadsPatterns from './threads-patterns';
import jmmVisibility from './jmm-visibility';

export type { LessonMeta } from '@/components/lesson/lesson-page';
import type { StoryStep } from '@/components/lesson/story-page';
export type LessonEntry = { meta: LessonMeta; Body?: LessonComponent; steps?: StoryStep[] };

const entries = new Map<string, LessonEntry>([
  [intuitionWhy.meta.id, intuitionWhy],
  [intuitionThreads.meta.id, intuitionThreads],
  [intuitionParallelism.meta.id, intuitionParallelism],
  [intuitionCpuIo.meta.id, intuitionCpuIo],
  [threadsLifecycle.meta.id, threadsLifecycle],
  [threadsInterrupt.meta.id, threadsInterrupt],
  [threadsWaitNotify.meta.id, threadsWaitNotify],
  [threadsPatterns.meta.id, threadsPatterns],
  [jmmVisibility.meta.id, jmmVisibility],
]);

// 课程展示顺序
export const lessonOrder = Array.from(entries.keys());

export function getLesson(id: string): LessonEntry | null {
  return entries.get(id) ?? null;
}

export function lessonNav(id: string): { prev?: string; next?: string } {
  const i = lessonOrder.indexOf(id);
  return {
    prev: i > 0 ? lessonOrder[i - 1] : undefined,
    next: i >= 0 && i < lessonOrder.length - 1 ? lessonOrder[i + 1] : undefined,
  };
}
