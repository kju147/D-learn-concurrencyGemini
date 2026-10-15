'use client';

import { useState, type ComponentType } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { View } from '@/components/learning-app';

export type LessonMeta = {
  id: string;
  moduleId: string;
  moduleIndex: string;
  moduleTitle: string;
  title: string;
  subtitle: string;
  kind: string;
  minutes: number;
  level: string;
  outcomes: string[];
  /** 终点页关联的判题练习（没有则不显示入口） */
  exerciseId?: string;
};

export type LessonComponent = ComponentType<{ onDone: () => void }>;

type LessonEntry = { meta: LessonMeta; Body: LessonComponent };

export function LessonPage({
  entry,
  order,
  done,
  onDone,
  open,
}: {
  entry: LessonEntry;
  order: { prev?: string; next?: string };
  done: boolean;
  onDone: () => void;
  open: (v: View, lessonId?: string) => void;
}) {
  const { meta, Body } = entry;
  return (
    <div>
      <button
        onClick={() => open('roadmap')}
        className="mb-5 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        返回课程地图
      </button>

      <header className="mb-6 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{meta.moduleIndex} · {meta.moduleTitle}</Badge>
          <Badge variant="outline">{meta.kind} · {meta.minutes} 分钟</Badge>
          <Badge variant="outline">{meta.level}</Badge>
        </div>
        <h1 className="m3-title mt-3 text-[1.75rem] leading-tight sm:text-[2rem]">{meta.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{meta.subtitle}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-[10px] font-medium text-muted-foreground">学完你将能</p>
          {meta.outcomes.map((o) => (
            <span key={o} className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">
              {o}
            </span>
          ))}
        </div>
      </header>

      <Body onDone={onDone} />

      <footer className="mt-8 flex items-center justify-between border-t border-border pt-5">
        {order.prev ? (
          <Button variant="ghost" onClick={() => open('lesson', order.prev)}>
            <ArrowLeft /> 上一课
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={onDone} variant={done ? 'outline' : 'default'}>
          {done ? <Check /> : <Check />}
          {done ? '已完成 · 可复习' : '我学完了这一课'}
        </Button>
        {order.next ? (
          <Button variant="ghost" onClick={() => open('lesson', order.next)}>
            下一课 <ArrowRight />
          </Button>
        ) : (
          <span />
        )}
      </footer>

      <div className="mt-5">
        <Progress value={done ? 100 : 50} className="h-1" />
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          {done ? '本课已完成' : '读完 + 做完练习后点击完成'}
        </p>
      </div>
    </div>
  );
}
