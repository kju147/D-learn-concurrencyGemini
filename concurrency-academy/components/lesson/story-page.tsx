'use client';

// 课程故事线壳：section 依次揭示，左栏步骤栏黏着，完成时拉闸
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { View } from '@/components/learning-app';

export type StoryStep = {
  id: string;
  title: string;
  goal: string;          // 这一步「要学会什么」一行话
  body: ReactNode;
  /** 是否需要学习者完成一次互动按钮按下才解锁下一步（默认 true） */
  gate?: boolean;
};

export type StoryLessonMeta = {
  id: string;
  moduleTitle: string;
  moduleIndex: string;
  title: string;
  subtitle: string;
  minutes: number;
  level: string;
  /** 与该课配套的判题练习 id（没有则不显示入口） */
  exerciseId?: string;
};

export function StoryLessonPage({
  meta,
  steps,
  done,
  onDone,
  open,
  openLab,
}: {
  meta: StoryLessonMeta;
  steps: StoryStep[];
  done: boolean;
  onDone: () => void;
  open: (v: View, lessonId?: string) => void;
  openLab?: (exerciseId: string) => void;
}) {
  const [cursor, setCursor] = useState(0);
  const [finished, setFinished] = useState(done);
  const finishedRef = useRef(done);
  useEffect(() => { finishedRef.current = done; setFinished(done); }, [done]);

  const total = steps.length + 1; // +终点
  const isEnd = cursor === total - 1;
  const step = isEnd ? null : steps[cursor];

  const useStep = (i: number) => {
    setCursor(i);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const progressPercent = useMemo(
    () => Math.round((cursor / (total - 1)) * 100),
    [cursor, total],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      {/* 左侧故事步骤栏 */}
      <aside className="sticky top-24 hidden self-start rounded-xl border border-border bg-card p-4 lg:block">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
          课程线路
        </p>
        <ol className="space-y-0.5">
          {steps.map((s, i) => {
            const state = i < cursor ? 'done' : i === cursor ? 'current' : 'todo';
            return (
              <li key={s.id}>
                <button
                  onClick={() => useStep(i)}
                  disabled={i > cursor}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition',
                    state === 'current' && 'bg-primary/10 font-semibold text-primary',
                    state === 'done' && 'text-muted-foreground hover:bg-muted',
                    state === 'todo' && 'cursor-not-allowed opacity-40',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold',
                      state === 'done' && 'border-emerald-500 bg-emerald-500 text-white',
                      state === 'current' && 'border-primary text-primary',
                      state === 'todo' && 'border-border text-muted-foreground',
                    )}
                  >
                    {state === 'done' ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span className="min-w-0 leading-5">{s.title}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => useStep(steps.length)}
              disabled={cursor < steps.length}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs',
                isEnd && 'bg-primary/10 font-semibold text-primary',
                !isEnd && cursor >= steps.length - 1 && isEnd,
                'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold',
                  isEnd && 'border-primary text-primary',
                  !isEnd && 'border-border text-muted-foreground',
                )}
              >
                🏁
              </span>
              课程终点
            </button>
          </li>
        </ol>

        <div className="mt-5 border-t border-border pt-4">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>本课进度</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </aside>

      {/* 主区 */}
      <div>
        <button
          onClick={() => open('roadmap')}
          className="mb-5 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回课程地图
        </button>

        <header className="mb-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {meta.moduleIndex} · {meta.moduleTitle}
            </Badge>
            <Badge variant="outline">{meta.minutes} 分钟</Badge>
            <Badge variant="outline">{meta.level}</Badge>
          </div>
          <h1 className="m3-title mt-3 text-[1.6rem] leading-tight sm:text-[1.9rem]">
            {meta.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {meta.subtitle}
          </p>
          {finished && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <Check className="size-3.5" /> 本课已完成
            </p>
          )}
        </header>

        {!isEnd && step && (
          <article key={step.id} className="m3-page-enter">
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-6">
              <span className="font-semibold text-primary">本步目标：</span>
              <span className="text-foreground">{step.goal}</span>
            </div>
            {step.body}
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <Button
                variant="ghost"
                disabled={cursor === 0}
                onClick={() => useStep(cursor - 1)}
              >
                <ArrowLeft /> 上一步
              </Button>
              <p className="text-[10px] text-muted-foreground">
                {cursor + 1} / {total} · {steps[cursor].title}
              </p>
              <Button onClick={() => useStep(cursor + 1)}>
                继续 <ChevronDown className="-rotate-90" />
              </Button>
            </div>
          </article>
        )}

        {isEnd && (
          <article className="m3-page-enter rounded-xl border border-emerald-300/50 bg-emerald-50/60 p-6 dark:border-emerald-500/20 dark:bg-emerald-950/25">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                🏁
              </div>
              <div className="min-w-0">
                <h2 className="m3-title text-xl">课程终点</h2>
                <p className="mt-1 text-sm leading-6 text-emerald-900 dark:text-emerald-100">
                  站好这一班岗，完成了
                  <strong> {meta.title} </strong>
                  的内容。测验、实验和练习都验收后，点下方完成；有任何一步没做透的，随时回侧栏开走。
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button onClick={onDone} disabled={finished}>
                    <Check /> {finished ? '已完成' : '杆上课完打一次卡'}
                  </Button>
                  {openLab && meta.exerciseId && (
                    <Button variant="outline" onClick={() => openLab(meta.exerciseId!)}>
                      去『并发实验室』做判题练习
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => useStep(0)}>
                    <ArrowLeft /> 从头再过一遍
                  </Button>
                </div>
              </div>
            </div>
          </article>
        )}

        <footer className="mt-6 text-center text-[10px] text-muted-foreground">
          每步捅开放下一步。其余课程无任何广告、全部本地缓存。
        </footer>
      </div>
    </div>
  );
}
