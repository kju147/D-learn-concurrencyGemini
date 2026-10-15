'use client';

// 课程通用组件块：叙述、时间线、预测问答、可运行代码实验、名词卡、对比例
import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  Code2,
  ChevronDown,
  FlaskConical,
  Lightbulb,
  Play,
  RefreshCw,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { JavaCodeEditor } from '@/components/java-code-editor';
import {
  ensureReady,
  onRunnerEvent,
  runFiles,
  getStatus,
  type RuntimeStatus,
} from '@/lib/wasm-java-runner';

/* ---------- 文本段落 ---------- */
export function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {number}
      </p>
      <h2 className="m3-title mt-1.5 text-lg">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="code-pill">{children}</code>;
}

/* ---------- 名词卡 ---------- */
export function TermCard({ items }: { items: [string, string][] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold text-primary">名词速查</p>
      <div className="mt-3 space-y-2">
        {items.map(([term, def]) => (
          <details key={term} className="rounded-lg bg-muted p-3.5 min-w-0 text-xs leading-6">
            <summary className="cursor-pointer font-semibold list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
              <span className="text-foreground">{term}</span>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </summary>
            <p className="mt-2 text-muted-foreground">{def}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

/* ---------- 预警条 ---------- */
export function Callout({
  variant = 'idea',
  children,
}: {
  variant?: 'idea' | 'warning';
  children: ReactNode;
}) {
  const styles =
    variant === 'warning'
      ? 'border-amber-300/50 bg-amber-50/80 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
      : 'border-emerald-300/50 bg-emerald-50/80 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100';
  const Icon = variant === 'warning' ? AlertTriangle : Lightbulb;
  return (
    <div className={`rounded-xl border p-4 text-xs leading-6 ${styles}`}>
      <div className="flex gap-2">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <div>{children}</div>
      </div>
    </div>
  );
}

/* ---------- 先预测 ---------- */
export function Predict({
  question,
  options,
  id,
}: {
  question: string;
  options: { label: string; correct: boolean; explain?: string }[];
  id?: string;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correctIdx = options.findIndex((o) => o.correct);
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 text-xs font-semibold text-primary">
        <FlaskConical className="size-4" /> 先预测，再看答案
      </p>
      <p className="mt-2 text-sm font-medium leading-6">{question}</p>
      <div className="mt-3 space-y-2">
        {options.map((option, index) => {
          const chosen = picked === index;
          const revealStyle = !answered
            ? ''
            : option.correct
              ? 'border-emerald-400/60 bg-emerald-50 dark:bg-emerald-950/30'
              : chosen
                ? 'border-red-400/60 bg-red-50 dark:bg-red-950/30'
                : '';
          return (
            <button
              key={index}
              onClick={() => setPicked(index)}
              disabled={answered}
              className={`w-full rounded-lg border border-border p-3 text-left text-xs leading-6 transition hover:border-primary/40 disabled:cursor-default ${revealStyle}`}
            >
              <span className="flex items-start gap-2">
                {answered ? (
                  option.correct ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  ) : chosen ? (
                    <X className="mt-0.5 size-4 shrink-0 text-red-500" />
                  ) : (
                    <span className="mt-1 size-4 shrink-0 rounded-full border border-border" />
                  )
                ) : (
                  <span className="mt-1 size-4 shrink-0 rounded-full border border-border" />
                )}
                <span>
                  <span className="font-medium">{option.label}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="m3-expand-enter mt-3 rounded-lg bg-muted p-3.5 text-xs leading-6">
          {options[correctIdx]?.explain && (
            <p className="text-muted-foreground">
              <strong className="text-foreground">解析：</strong>
              {options[correctIdx].explain}
            </p>
          )}
        </div>
      )}
      {id && <span className="hidden" data-predict-id={id} />}
    </div>
  );
}

/* ---------- 线程时间线（核心可交互） ---------- */
export type TimelineThread = { id: string; label: string; accent: string };
export type TimelineStep = {
  title: string;
  note: string;
  marks: Record<string, string>; // threadId -> cell text（如 "RUNNABLE" / "BLOCKED"）
};

export function ThreadTimeline({ threads, steps }: { threads: TimelineThread[]; steps: TimelineStep[] }) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-primary">时间线 · 逐帧观察</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)}>
            上一帧
          </Button>
          <span className="text-[10px] text-muted-foreground">
            {step + 1} / {steps.length}
          </span>
          <Button variant="outline" size="sm" disabled={step === steps.length - 1}
            onClick={() => setStep(step + 1)}>
            下一帧
          </Button>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-0 text-left text-[11px]">
          <thead>
            <tr>
              <th className="w-28 px-2 py-1 font-medium text-muted-foreground">线程</th>
              <th className="px-3 py-1 font-medium text-muted-foreground">当前状态</th>
            </tr>
          </thead>
          <tbody>
            {threads.map((thread) => (
              <tr key={thread.id} className="border-t border-border">
                <td className="px-2 py-2.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] ${thread.accent}`}>
                    {thread.label}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-foreground/90">
                  {current.marks[thread.id] ?? '（未创建/已结束）'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 rounded-lg bg-muted p-3 text-xs leading-6 text-muted-foreground">
        <strong className="text-foreground">{current.title}：</strong>
        {current.note}
      </p>
    </div>
  );
}

/* ---------- 代码实验室：浏览器内运行 ---------- */
function CodeLabInner({
  title,
  moduleId,
  starterCode,
  expectedOutput,
  note,
}: {
  title: string;
  moduleId: string;
  starterCode: string;
  expectedOutput?: string;
  note?: ReactNode;
}) {
  const [code, setCode] = useState(starterCode);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<RuntimeStatus>(getStatus());
  const [stageText, setStageText] = useState('');

  useEffect(() => onRunnerEvent((e) => {
    if (e.type === 'status') setStatus(e.status);
    if (e.type === 'stage') setStageText(e.text);
  }), []);

  const run = async () => {
    setRunning(true);
    setOutput('');
    try {
      await ensureReady();
      const outcome = await runFiles([{ name: 'Main', content: code }], 'Main', 60000);
      const clean = (t: string) => t.split('\n').filter((l) => !l.startsWith('JBOX_')).join('\n');
      setOutput(
        (clean(outcome.stdout) ? clean(outcome.stdout) : '') +
        (outcome.stderr.trim() ? '\n[stderr]\n' + outcome.stderr.trim() : ''),
      );
    } catch (e) {
      setOutput(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          <Code2 className="mr-1 size-3" /> 可运行实验
        </Badge>
        <p className="text-xs font-semibold">{title}</p>
      </div>
      {note && <p className="mt-2 text-xs leading-6 text-muted-foreground">{note}</p>}
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-800">
        <div className="bg-slate-950 px-4 py-2 text-[11px] font-semibold text-slate-300">{moduleId} · Main.java</div>
        <JavaCodeEditor value={code} exerciseId={`lab:${moduleId}:${title}`} onChange={setCode} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={run} disabled={running}>
          {running ? <RefreshCw className="animate-spin" /> : <Play />}
          {running ? '正在运行…' : status === 'ready' ? '在浏览器 JVM 运行' : '启动 JVM 并运行'}
        </Button>
        {expectedOutput !== undefined && <div className="text-[10px] text-muted-foreground">预期输出：<code className="code-pill">{expectedOutput}</code></div>}
      </div>
      {status === 'booting' && (
        <p className="mt-2 text-xs text-muted-foreground">正在启动浏览器内 JVM… {stageText}</p>
      )}
      {(output || running) && (
        <pre className="code-block mt-3 max-h-72 overflow-auto p-3 text-xs leading-5">
          {running && !output ? '等待输出…\n' : ''}
          {output || ''}
        </pre>
      )}
    </div>
  );
}

export function CodeLab(props: Parameters<typeof CodeLabInner>[0]) {
  return <CodeLabInner key={props.moduleId + ':' + props.title} {...props} />;
}

/* ---------- 错例 vs 正对 ---------- */
export function WrongRight({
  wrongTitle,
  wrongCode,
  wrongNote,
  rightCode,
  rightNote,
}: {
  wrongTitle: string;
  wrongCode: string;
  wrongNote: string;
  rightCode: string;
  rightNote: string;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-500/25 dark:bg-red-950/25">
        <p className="flex items-center gap-2 text-xs font-semibold text-red-800 dark:text-red-200">
          <X className="size-4" /> {wrongTitle}
        </p>
        <pre className="code-block mt-3 overflow-auto p-3 text-xs">{wrongCode}</pre>
        <p className="mt-2 text-[11px] leading-5 text-red-700 dark:text-red-300">{wrongNote}</p>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/25 dark:bg-emerald-950/25">
        <p className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
          <Check className="size-4" /> 经过验证的写法
        </p>
        <pre className="code-block mt-3 overflow-auto p-3 text-xs">{rightCode}</pre>
        <p className="mt-2 text-[11px] leading-5 text-emerald-700 dark:text-emerald-300">{rightNote}</p>
      </div>
    </div>
  );
}
