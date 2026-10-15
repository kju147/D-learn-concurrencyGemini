'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Binary,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  FlaskConical,
  Gauge,
  GitBranch,
  GraduationCap,
  Home,
  Layers3,
  Lightbulb,
  ListChecks,
  Menu,
  Moon,
  Network,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { JavaCodeEditor } from '@/components/java-code-editor';
import { JavaExecutionPanel } from '@/components/java-execution-panel';
import { Progress } from '@/components/ui/progress';
import {
  capstoneMilestones,
  courseModules,
  glossary,
  references,
  reviewCards,
} from '@/app/content';
import { codeExercises } from '@/app/code-exercises';
import { getLesson, lessonNav } from '@/lib/lessons';
import { LessonPage } from '@/components/lesson/lesson-page';
import { StoryLessonPage } from '@/components/lesson/story-page';

export type View =
  | 'dashboard'
  | 'diagnostic'
  | 'roadmap'
  | 'lesson'
  | 'lab'
  | 'review'
  | 'project'
  | 'glossary';
type IconType = typeof Home;
const initialCompleted: string[] = [];
const nav: { id: View; label: string; icon: IconType; count?: number }[] = [
  { id: 'dashboard', label: '学习台', icon: Home },
  { id: 'diagnostic', label: '入学诊断', icon: Target },
  { id: 'roadmap', label: '课程地图', icon: Layers3 },
  { id: 'lesson', label: 'JMM 教学样板', icon: BookOpen },
  { id: 'lab', label: '并发实验室', icon: FlaskConical },
  { id: 'review', label: '记忆复习', icon: BrainCircuit, count: 6 },
  { id: 'project', label: '集大成项目', icon: GraduationCap },
  { id: 'glossary', label: '名词词典', icon: CircleHelp },
];

type DiagnosticDomain = '基础直觉' | '线程安全' | 'JMM' | '工具与架构';
type DiagnosticQuestion = {
  id: string;
  domain: DiagnosticDomain;
  prompt: string;
  scenario?: string;
  options: { label: string; score: 0 | 1 | 2 }[];
};

const diagnosticQuestions: DiagnosticQuestion[] = [
  {
    id: 'terms',
    domain: '基础直觉',
    prompt: '一个线程调用远程接口时一直等待响应，这最准确地描述为？',
    options: [
      { label: '并行且异步', score: 0 },
      { label: '并发场景中的阻塞等待', score: 2 },
      { label: '只要使用线程池就属于非阻塞', score: 0 },
    ],
  },
  {
    id: 'start',
    domain: '基础直觉',
    prompt: '直接调用 thread.run() 与 thread.start() 的关键区别是什么？',
    options: [
      { label: '没有区别，都会创建新线程', score: 0 },
      { label: 'run 更快，start 更安全', score: 0 },
      { label: 'run 在当前线程执行；start 启动新线程后调用 run', score: 2 },
    ],
  },
  {
    id: 'interrupt',
    domain: '基础直觉',
    prompt:
      '捕获 InterruptedException 后，当前方法无法完成取消，应优先怎么做？',
    options: [
      { label: '吞掉异常继续运行', score: 0 },
      { label: '恢复中断标记并向上退出或传播', score: 2 },
      { label: '调用 Thread.stop()', score: 0 },
    ],
  },
  {
    id: 'compound',
    domain: '线程安全',
    prompt:
      '把共享 int count 声明为 volatile 后，多个线程执行 count++ 是否安全？',
    options: [
      { label: '安全，volatile 保证所有线程看到新值', score: 0 },
      { label: '不安全，count++ 是读—改—写复合操作', score: 2 },
      { label: '线程数少于 CPU 核数时安全', score: 0 },
    ],
  },
  {
    id: 'wait',
    domain: '线程安全',
    prompt: '条件不满足时使用 wait()，更可靠的等待范式是？',
    options: [
      { label: 'if (条件不满足) wait()', score: 0 },
      { label: 'while (条件不满足) wait()', score: 2 },
      { label: 'sleep 一段时间后重试', score: 0 },
    ],
  },
  {
    id: 'hb',
    domain: 'JMM',
    prompt:
      '线程 A 先在日志中打印“已写入”，线程 B 后打印“读取”，能否证明 B 必须看见 A 的普通变量写入？',
    options: [
      { label: '能，日志时间已经证明先后', score: 0 },
      { label: '不能，还需要建立 happens-before 关系', score: 2 },
      { label: '只要两条日志相差 1 秒就能', score: 0 },
    ],
  },
  {
    id: 'publication',
    domain: 'JMM',
    prompt: '双重检查锁中的实例引用为什么通常需要 volatile？',
    options: [
      { label: '防止引用发布与对象初始化发生危险重排序', score: 2 },
      { label: '让构造器只执行一次', score: 1 },
      { label: '让 synchronized 变成公平锁', score: 0 },
    ],
  },
  {
    id: 'pool',
    domain: '工具与架构',
    prompt: '线程池采用无界队列时，突发流量超过处理能力，最可能先出现什么？',
    options: [
      { label: '自动扩容到 maximumPoolSize', score: 0 },
      { label: '请求持续排队，延迟和内存占用不断上升', score: 2 },
      { label: '立即触发拒绝策略保护系统', score: 0 },
    ],
  },
  {
    id: 'virtual',
    domain: '工具与架构',
    prompt: 'JDK 21 虚拟线程处理大量阻塞 I/O 时，正确的资源控制方式是？',
    options: [
      { label: '建立固定大小的虚拟线程池', score: 0 },
      { label: '一任务一虚拟线程，用 Semaphore/连接池限制稀缺资源', score: 2 },
      { label: '把线程数固定为 CPU 核数', score: 1 },
    ],
  },
];

export function LearningApp() {
  const [view, setView] = useState<View>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [pendingExerciseId, setPendingExerciseId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [completed, setCompleted] = useState<string[]>(initialCompleted);
  const [reviewed, setReviewed] = useState(0);
  useEffect(() => {
    const savedTheme = window.localStorage.getItem('concurrency-theme');
    setTheme(
      savedTheme === 'dark' || savedTheme === 'light'
        ? savedTheme
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light',
    );
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('concurrency-theme', theme);
  }, [theme]);
  useEffect(() => {
    const saved = window.localStorage.getItem(
      'concurrency-academy-progress-v2',
    );
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        completed?: string[];
        reviewed?: number;
      };
      if (parsed.completed) setCompleted(parsed.completed);
      if (typeof parsed.reviewed === 'number') setReviewed(parsed.reviewed);
    } catch {}
  }, []);
  useEffect(() => {
    window.localStorage.setItem(
      'concurrency-academy-progress-v2',
      JSON.stringify({ completed, reviewed }),
    );
  }, [completed, reviewed]);
  const totalLessons = courseModules.reduce(
    (sum, module) => sum + module.lessons.length,
    0,
  );
  const progress = Math.round((completed.length / totalLessons) * 100);
  const open = (next: View, lessonId?: string) => {
    if (lessonId !== undefined) setActiveLessonId(lessonId);
    setView(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openLab = (exerciseId: string) => {
    setPendingExerciseId(exerciseId);
    open('lab');
  };
  return (
    <main className="min-h-screen bg-background text-foreground">
      <TopBar
        onMenu={() => setMobileOpen(true)}
        progress={progress}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      />
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[256px_minmax(0,1fr)]">
        <Sidebar
          view={view}
          open={open}
          progress={progress}
          completed={completed.length}
          total={totalLessons}
        />
        {mobileOpen && (
          <MobileNav
            view={view}
            open={open}
            close={() => setMobileOpen(false)}
          />
        )}
        <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div
            key={view}
            className={`m3-page-enter mx-auto ${view === 'lab' ? 'max-w-[1400px]' : 'max-w-[1180px]'}`}
          >
            {view === 'dashboard' && (
              <Dashboard
                open={open}
                progress={progress}
                completed={completed.length}
                total={totalLessons}
              />
            )}
            {view === 'diagnostic' && <DiagnosticView open={open} />}
            {view === 'roadmap' && (
              <Roadmap completed={completed} open={open} />
            )}
            {view === 'lesson' && (
              <LessonDispatcher
                lessonId={activeLessonId}
                completed={completed}
                setCompleted={setCompleted}
                open={open}
                openLab={openLab}
              />
            )}
            {view === 'lab' && <LabView pendingExerciseId={pendingExerciseId} />}
            {view === 'review' && (
              <ReviewView
                reviewed={reviewed}
                setReviewed={setReviewed}
                open={open}
              />
            )}
            {view === 'project' && <ProjectView />}
            {view === 'glossary' && <GlossaryView />}
          </div>
        </section>
      </div>
    </main>
  );
}

function TopBar({
  onMenu,
  progress,
  theme,
  onToggleTheme,
}: {
  onMenu: () => void;
  progress: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[var(--surface-container-lowest)]">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 lg:px-6">
        <button
          className="grid size-10 place-items-center rounded-full hover:bg-muted lg:hidden"
          onClick={onMenu}
          aria-label="打开导航"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex min-w-fit items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GitBranch className="size-[18px]" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[16px] font-semibold tracking-tight">
              并发进阶之路{' '}
              <Badge
                variant="secondary"
                className="h-5 rounded-md px-1.5 text-[9px]"
              >
                JDK 21
              </Badge>
            </div>
          </div>
        </div>
        <button className="mx-auto hidden h-10 w-full max-w-md items-center gap-2 rounded-full bg-muted px-4 text-sm text-muted-foreground transition-colors hover:bg-[var(--surface-container-high)] md:flex">
          <Search className="size-4" />
          <span>搜索概念、API、事故案例...</span>
          <kbd className="ml-auto rounded-md bg-background/70 px-1.5 py-0.5 font-mono text-[10px]">
            Ctrl K
          </kbd>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full bg-muted px-3 py-2 sm:flex">
            <Flame className="size-4 text-orange-600 dark:text-orange-300" />
            <span className="text-xs font-medium">7 天</span>
          </div>
          <div className="hidden text-xs font-medium text-muted-foreground xl:block">
            总进度 {progress}%
          </div>
          <button
            onClick={onToggleTheme}
            className="grid size-10 place-items-center rounded-full transition-colors hover:bg-muted"
            aria-label={theme === 'light' ? '切换到暗色主题' : '切换到亮色主题'}
          >
            {theme === 'light' ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
          </button>
          <div className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            J
          </div>
        </div>
      </div>
    </header>
  );
}
function Sidebar({
  view,
  open,
  progress,
  completed,
  total,
}: {
  view: View;
  open: (v: View) => void;
  progress: number;
  completed: number;
  total: number;
}) {
  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-64px)] border-r border-sidebar-border bg-sidebar px-3 py-5 lg:flex lg:flex-col">
      <NavItems view={view} open={open} />
      <div className="mt-7 border-t border-sidebar-border px-3 pt-5">
        <div className="mb-3 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
          <span>课程总进度</span>
          <span>{progress}%</span>
        </div>
        <Progress
          value={progress}
          className="[&_[data-slot=progress-indicator]]:bg-primary [&_[data-slot=progress-track]]:h-1.5"
        />
        <p className="mt-2 text-[10px] text-muted-foreground">
          已掌握 {completed} / {total} 课
        </p>
      </div>
      <div className="mt-6 space-y-3 px-3">
        {courseModules.slice(0, 4).map((module, index) => (
          <div key={module.id} className="flex items-center gap-3">
            <span
              className={`grid size-7 place-items-center rounded-full text-[10px] font-semibold ${index === 0 ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {module.index}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{module.title}</p>
              {index === 0 && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  建议从这里开始
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto rounded-xl bg-[var(--surface-container)] p-4">
        <div className="mb-3 grid size-8 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <Sparkles className="size-4" />
        </div>
        <p className="text-xs font-bold">学习原则</p>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          先预测，再运行；先证明正确，再谈性能。
        </p>
      </div>
    </aside>
  );
}
function MobileNav({
  view,
  open,
  close,
}: {
  view: View;
  open: (v: View) => void;
  close: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 lg:hidden">
      <aside className="h-full w-[300px] border-r border-border bg-sidebar p-5 shadow-xl">
        <div className="mb-7 flex items-center justify-between">
          <strong>导航</strong>
          <button onClick={close} aria-label="关闭导航">
            <X className="size-5" />
          </button>
        </div>
        <NavItems view={view} open={open} />
      </aside>
    </div>
  );
}
function NavItems({ view, open }: { view: View; open: (v: View) => void }) {
  return (
    <nav className="space-y-1" aria-label="主导航">
      {nav.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => open(item.id)}
            data-active={view === item.id}
            className={`m3-nav-item flex h-10 w-full items-center gap-3 px-4 text-left text-sm ${view === item.id ? 'font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
            {item.count && (
              <span className="ml-auto grid size-5 place-items-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function DiagnosticView({ open }: { open: (v: View) => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const question = diagnosticQuestions[index];
  const selected = answers[question.id];
  const answered = Object.keys(answers).length;

  const domainScores = diagnosticQuestions.reduce(
    (result, item) => {
      const answerIndex = answers[item.id];
      result[item.domain].score +=
        answerIndex === undefined ? 0 : item.options[answerIndex].score;
      result[item.domain].max += 2;
      return result;
    },
    {
      基础直觉: { score: 0, max: 0 },
      线程安全: { score: 0, max: 0 },
      JMM: { score: 0, max: 0 },
      工具与架构: { score: 0, max: 0 },
    } as Record<DiagnosticDomain, { score: number; max: number }>,
  );
  const total = diagnosticQuestions.reduce((sum, item) => {
    const answerIndex = answers[item.id];
    return (
      sum + (answerIndex === undefined ? 0 : item.options[answerIndex].score)
    );
  }, 0);
  const level = total <= 7 ? '基础重建' : total <= 13 ? '进阶强化' : '高级查漏';
  const start =
    domainScores.基础直觉.score < 4
      ? ['M00', '入学预备与并发直觉']
      : domainScores.线程安全.score < 3
        ? ['M02', '共享状态与互斥']
        : domainScores.JMM.score < 3
          ? ['M04', 'Java 内存模型']
          : ['M05', 'Monitor、显式锁与 AQS'];

  const reset = () => {
    setAnswers({});
    setIndex(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <>
        <PageIntro
          eyebrow="M00 · 诊断报告"
          title={`你的建议路线：${level}`}
          description="这不是职级判断，而是本课程的学习入口。高分模块仍会通过挑战题验证，低分模块会补齐必要先修。"
          action={
            <Badge className="h-8 bg-primary/12 px-3 text-primary">
              {total} / 18 分
            </Badge>
          }
        />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
          <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              四维能力快照
            </p>
            <div className="mt-6 space-y-5">
              {(
                Object.entries(domainScores) as [
                  DiagnosticDomain,
                  { score: number; max: number },
                ][]
              ).map(([domain, value]) => {
                const percent = Math.round((value.score / value.max) * 100);
                const status =
                  percent < 50
                    ? '必修'
                    : percent < 80
                      ? '建议巩固'
                      : '可挑战跳过';
                return (
                  <div key={domain}>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-bold">{domain}</span>
                      <span className="text-muted-foreground">
                        {value.score}/{value.max} · {status}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <aside className="rounded-xl border border-primary/30 bg-primary/8 p-5 sm:p-6">
            <Badge className="bg-primary text-primary-foreground">
              建议起点
            </Badge>
            <p className="mt-5 font-mono text-xs font-bold text-primary">
              {start[0]}
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold">
              {start[1]}
            </h2>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              系统会保留完整知识图，但把已掌握内容变成挑战测试；通过后直接解锁，不要求重复看课。
            </p>
            <div className="mt-6 space-y-2">
              <Button
                onClick={() => open('roadmap')}
                className="w-full rounded-xl"
              >
                查看个性化路线 <ArrowRight />
              </Button>
              <Button
                onClick={reset}
                variant="outline"
                className="w-full rounded-xl"
              >
                <RotateCcw />
                重新诊断
              </Button>
            </div>
          </aside>
        </div>
        <SectionTitle
          title="如何解释这份结果"
          description="诊断只决定入口，不替代后续的代码实作与通关验收。"
        />
        <div className="grid gap-3 md:grid-cols-3">
          <MiniCard
            icon={Target}
            title="低于 50%"
            text="从直觉、反例和最小实验开始，补齐后续课程必须依赖的概念。"
          />
          <MiniCard
            icon={ShieldCheck}
            title="50%—79%"
            text="跳过术语导入，但必须完成边界判断、代码修复和业务迁移题。"
          />
          <MiniCard
            icon={Trophy}
            title="80% 以上"
            text="进入挑战模式；通过实作验收即可跳过讲解，失败则回到对应薄弱点。"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => open('dashboard')}
        className="mb-5 flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        返回学习台
      </button>
      <PageIntro
        eyebrow={`M00 · 入学诊断 · ${index + 1}/${diagnosticQuestions.length}`}
        title="用情境题找到真实薄弱点。"
        description="不查资料，按你现在会在代码评审或事故现场作出的判断回答。诊断结果只保存在当前设备。"
        action={
          <Badge variant="outline" className="h-8 px-3">
            已回答 {answered}/{diagnosticQuestions.length}
          </Badge>
        }
      />
      <div className="mx-auto max-w-3xl">
        <Progress
          value={((index + 1) / diagnosticQuestions.length) * 100}
          className="mb-5 [&_[data-slot=progress-track]]:h-1.5"
        />
        <section className="m3-surface p-5 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <Badge className="bg-primary/12 text-primary">
              {question.domain}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              Q{String(index + 1).padStart(2, '0')}
            </span>
          </div>
          <h1 className="mt-6 font-heading text-xl font-semibold leading-8 sm:text-2xl">
            {question.prompt}
          </h1>
          <div className="mt-7 space-y-3">
            {question.options.map((option, optionIndex) => (
              <button
                key={option.label}
                onClick={() =>
                  setAnswers({ ...answers, [question.id]: optionIndex })
                }
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm leading-6 transition ${selected === optionIndex ? 'border-primary/60 bg-primary/10 text-foreground' : 'border-border bg-background/35 text-muted-foreground hover:border-primary/30'}`}
              >
                <span
                  className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-xs font-semibold ${selected === optionIndex ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-7 flex items-center justify-between">
            <Button
              variant="outline"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
              className="rounded-xl"
            >
              <ArrowLeft />
              上一题
            </Button>
            <Button
              disabled={selected === undefined}
              onClick={() =>
                index === diagnosticQuestions.length - 1
                  ? setFinished(true)
                  : setIndex(index + 1)
              }
              className="rounded-xl"
            >
              {index === diagnosticQuestions.length - 1
                ? '生成诊断报告'
                : '下一题'}{' '}
              <ArrowRight />
            </Button>
          </div>
        </section>
        <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
          每道题只用于确定教学深度，不会展示“面试分数”或职级标签。
        </p>
      </div>
    </>
  );
}

function Dashboard({
  open,
  progress,
  completed,
  total,
}: {
  open: (v: View) => void;
  progress: number;
  completed: number;
  total: number;
}) {
  return (
    <>
      <PageIntro
        eyebrow="学习总览"
        title="继续学习 Java 并发"
        description="一次只完成一个任务。系统会根据诊断结果安排课程、代码练习与复习。"
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.8fr)]">
        <article className="m3-surface m3-interactive-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="secondary">下一步</Badge>
              <p className="m3-label mt-5">M00 · 入学诊断</p>
              <h2 className="m3-title mt-2 text-2xl">找到你的真实学习起点</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                9 道情境题检查并发直觉、线程安全、JMM
                和工程选择，不要求你重复学习已经掌握的内容。
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Gauge className="size-4" />约 4 分钟
            </div>
          </div>
          <div className="mt-7 border-t border-border pt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium">课程总进度</span>
              <span className="tabular-nums text-muted-foreground">
                {completed} / {total} 课
              </span>
            </div>
            <Progress
              value={progress}
              className="[&_[data-slot=progress-track]]:h-2"
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => open('diagnostic')} size="lg">
                开始诊断 <ArrowRight />
              </Button>
            </div>
          </div>
        </article>
        <aside className="m3-surface-tonal p-5 sm:p-6">
          <p className="m3-label">今日学习</p>
          <h2 className="m3-title mt-2 text-lg">选择一个明确任务</h2>
          <div className="mt-5 divide-y divide-border">
            {[
              ['入学诊断', '约 4 分钟', 'diagnostic'],
              ['课程地图', '查看完整路线', 'roadmap'],
              ['代码工坊', '3 道手写练习', 'lab'],
            ].map(([title, text, target], index) => (
              <button
                key={title}
                onClick={() => open(target as View)}
                className="m3-list-row flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-background text-xs font-medium">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {text}
                  </span>
                </span>
                <ChevronRight className="ml-auto size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

function Roadmap({
  completed,
  open,
}: {
  completed: string[];
  open: (v: View, lessonId?: string) => void;
}) {
  const [expanded, setExpanded] = useState('intuition');
  const [stage, setStage] = useState(0);
  const stages = [
    { label: '1 · 基础直觉', range: [0, 2], note: '任务、线程与协作' },
    { label: '2 · 并发核心', range: [2, 5], note: 'JMM、锁与工具箱' },
    { label: '3 · 工程实践', range: [5, 9], note: '异步、诊断与架构' },
    { label: '4 · 现代 Java', range: [9, 14], note: 'JDK 21 与生产实战' },
  ] as const;
  const activeStage = stages[stage];
  return (
    <>
      <PageIntro
        eyebrow="课程地图"
        title="分阶段掌握，而不是一次看完"
        description="每次只展开一个学习阶段和一个模块；诊断结果将决定你的实际入口。"
      />
      <div className="mb-5 grid gap-2 rounded-xl bg-muted p-2 sm:grid-cols-4">
        {stages.map((item, index) => (
          <button
            key={item.label}
            onClick={() => {
              setStage(index);
              setExpanded(courseModules[item.range[0]]?.id ?? '');
            }}
            className={`rounded-lg px-4 py-3 text-left transition-colors ${stage === index ? 'bg-background shadow-sm' : 'hover:bg-background/55'}`}
          >
            <span className="block text-xs font-semibold">{item.label}</span>
            <span className="mt-1 block text-[10px] text-muted-foreground">
              {item.note}
            </span>
          </button>
        ))}
      </div>
      <div key={stage} className="m3-page-enter space-y-2">
        {courseModules
          .slice(activeStage.range[0], activeStage.range[1])
          .map((module) => {
            const count = module.lessons.filter((lesson) =>
              completed.includes(lesson.id) ||
              completed.includes(`${module.id}:${lesson.id}`),
            ).length;
            const pct = Math.round((count / module.lessons.length) * 100);
            const isOpen = expanded === module.id;
            return (
              <article
                key={module.id}
                className={`overflow-hidden rounded-xl border bg-card transition ${isOpen ? 'border-primary/35' : 'border-border'}`}
              >
                <button
                  className="flex w-full items-center gap-4 p-4 text-left sm:p-5"
                  onClick={() => setExpanded(isOpen ? '' : module.id)}
                >
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold ${isOpen ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    {module.index}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="font-heading text-lg">
                        {module.title}
                      </strong>
                      {module.id === 'jdk21' && (
                        <Badge className="bg-amber-300 text-stone-950">
                          JDK 21
                        </Badge>
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {module.subtitle}
                    </span>
                  </span>
                  <span className="hidden w-32 sm:block">
                    <span className="mb-1 block text-right text-[10px] text-muted-foreground">
                      {count}/{module.lessons.length}
                    </span>
                    <span className="block h-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  </span>
                  <ChevronDown
                    className={`size-5 text-muted-foreground transition ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="m3-expand-enter border-t border-border px-4 pb-5 pt-4 sm:px-20">
                    <div className="mb-4 rounded-xl border border-primary/15 bg-primary/7 p-3 text-xs leading-5 text-muted-foreground">
                      <strong className="text-primary">通关标准：</strong>
                      {module.gate}
                    </div>
                    <div className="grid gap-2 xl:grid-cols-2">
                      {module.lessons.map((lesson, index) => {
                        const done =
                          completed.includes(lesson.id) ||
                          completed.includes(`${module.id}:${lesson.id}`);
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => {
                              if (getLesson(`${module.id}:${lesson.id}`) || lesson.id === 'visibility')
                                open('lesson', `${module.id}:${lesson.id}`);
                            }}
                            className="flex items-center gap-3 rounded-xl border border-border/75 bg-background/35 p-3 text-left hover:border-primary/30"
                          >
                            <span
                              className={`grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-semibold ${done ? 'bg-emerald-400/12 text-emerald-400' : 'bg-muted text-muted-foreground'}`}
                            >
                              {done ? (
                                <Check className="size-3.5" />
                              ) : (
                                index + 1
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2 text-xs font-semibold">
                                {lesson.title}
                                {lesson.jdk21 && (
                                  <span className="text-[9px] text-amber-300">
                                    21
                                  </span>
                                )}
                              </span>
                              <span className="mt-1 block text-[10px] text-muted-foreground">
                                {lesson.outcome}
                              </span>
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {lesson.minutes}m
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
      </div>
      <details className="m3-surface mt-5 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          查看内容依据与规范来源
        </summary>
        <div className="m3-expand-enter mt-4 grid gap-3 md:grid-cols-2">
          {references.map(([title, desc]) => (
            <div key={title} className="rounded-lg bg-muted p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <ExternalLink className="size-3.5" />
                {title}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}

function LessonView({
  completed,
  setCompleted,
  open,
}: {
  completed: string[];
  setCompleted: (v: string[]) => void;
  open: (v: View) => void;
}) {
  const [prediction, setPrediction] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [step, setStep] = useState(0);
  const [lessonStep, setLessonStep] = useState(0);
  const done = completed.includes('visibility');
  const lessonChapters = [
    '事故与不变量',
    '预测程序结果',
    '可视化执行',
    '工具边界',
    '业务决策',
  ];
  const steps = [
    ['初始', '主内存 running = true', '两个线程从同一状态开始。'],
    [
      '读取',
      'Thread B 读取 true',
      'JIT 可能把循环中的读取优化，线程也可能反复使用已读到的值。',
    ],
    [
      '写入',
      'Thread A 写入 false',
      '写入发生了，但没有同步动作建立跨线程的可见性保证。',
    ],
    [
      '失联',
      'Thread B 仍观察 true',
      '“时间上先写”不构成 happens-before；这就是数据竞争。',
    ],
    [
      '修复',
      'volatile write → read',
      'volatile 写 happens-before 后续对同一变量的 volatile 读。',
    ],
  ];
  const finish = () => {
    if (!done) setCompleted([...completed, 'visibility']);
  };
  return (
    <>
      <button
        onClick={() => open('roadmap')}
        className="mb-5 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        返回课程地图
      </button>
      <div className="mb-6 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex gap-2">
            <Badge variant="secondary">教学样板 · 非起始课</Badge>
            <Badge variant="outline">实验课 · 18 分钟</Badge>
          </div>
          <h1 className="m3-title text-[1.75rem] leading-tight sm:text-[2rem]">
            为什么另一个线程“看不见”新值？
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            目标不是背下 volatile，而是能证明：一次写入究竟通过哪条
            happens-before 路径对另一个线程可见。
          </p>
        </div>
        <div className="min-w-52 rounded-xl bg-muted p-4">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>本课进度</span>
            <span>{done ? '100%' : '40%'}</span>
          </div>
          <Progress
            value={done ? 100 : 40}
            className="mt-2 [&_[data-slot=progress-track]]:h-1.5"
          />
        </div>
      </div>
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {lessonChapters.map((item, index) => (
          <button
            key={item}
            onClick={() => setLessonStep(index)}
            className={`min-w-fit rounded-lg px-4 py-2.5 text-xs font-medium transition-colors ${lessonStep === index ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {index + 1}. {item}
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <LessonSection
            active={lessonStep === 0}
            number="01"
            title="先看事故，不看定义"
          >
            <p className="text-sm leading-7 text-muted-foreground">
              大促结束，运营把 <code className="code-pill">promotionOpen</code>{' '}
              改为 false；一个工作线程却仍在接单。日志里写操作早已发生，CPU
              也没有报错。问题不在“写没写”，而在“另一个线程凭什么必须看到”。
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniCard
                icon={Activity}
                title="现象"
                text="关闭后仍放行 37 个订单"
              />
              <MiniCard
                icon={Binary}
                title="不变量"
                text="关闭指令后不得创建新订单"
              />
              <MiniCard
                icon={Target}
                title="证明责任"
                text="找出跨线程可见性边"
              />
            </div>
          </LessonSection>
          <LessonSection
            active={lessonStep === 1}
            number="02"
            title="先预测，再运行"
          >
            <pre className="code-block">
              <code>{`class PromotionGate {\n  private boolean running = true;\n\n  void work() {\n    while (running) { /* accept order */ }\n  }\n\n  void close() { running = false; }\n}`}</code>
            </pre>
            <p className="mt-4 text-sm font-bold">
              一个线程执行 work()，另一个线程 1 秒后执行 close()。work()
              会怎样？
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {['一定停止', '可能永不停止', '编译错误'].map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setPrediction(option);
                    setRevealed(false);
                  }}
                  className={`rounded-xl border p-3 text-sm font-medium transition-colors ${prediction === option ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border bg-[var(--surface-container-lowest)] hover:bg-muted'}`}
                >
                  {option}
                </button>
              ))}
            </div>
            <Button
              disabled={!prediction}
              onClick={() => setRevealed(true)}
              className="mt-3"
            >
              验证我的判断 <Play />
            </Button>
            {revealed && (
              <div
                className={`mt-4 rounded-xl border p-4 ${prediction === '可能永不停止' ? 'border-emerald-400/25 bg-emerald-400/8' : 'border-amber-300/25 bg-amber-300/8'}`}
              >
                <p className="text-sm font-bold">
                  {prediction === '可能永不停止'
                    ? '判断正确。'
                    : '这正是最危险的直觉。'}{' '}
                  规范允许“可能永不停止”。
                </p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  两个访问存在数据竞争。没有同步动作时，close() 的普通写与
                  work() 的普通读之间不存在
                  happens-before。实验没有复现，也不能证明代码正确。
                </p>
              </div>
            )}
          </LessonSection>
          <LessonSection
            active={lessonStep === 2}
            number="03"
            title="把可见性画出来"
          >
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:p-6">
              <div className="grid gap-4 md:grid-cols-[1fr_150px_1fr]">
                <ThreadBox
                  name="Thread A · 运营指令"
                  value={step >= 2 ? 'running = false' : 'running = true'}
                  active={step === 2 || step === 4}
                  tone="cyan"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <span
                    className={`h-px w-full ${step === 4 ? 'bg-blue-300' : 'border-t border-dashed border-slate-700'}`}
                  />
                  <span
                    className={`rounded-full px-2 py-1 text-[9px] font-medium ${step === 4 ? 'bg-blue-950 text-blue-200' : 'bg-slate-800 text-slate-500'}`}
                  >
                    {step === 4 ? 'happens-before' : '没有同步边'}
                  </span>
                </div>
                <ThreadBox
                  name="Thread B · 接单循环"
                  value={
                    step >= 3 && step < 4
                      ? 'observed = true'
                      : step === 4
                        ? 'observed = false'
                        : 'observed = true'
                  }
                  active={step === 1 || step === 3 || step === 4}
                  tone="amber"
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {steps.map((item, index) => (
                  <button
                    key={item[0]}
                    onClick={() => setStep(index)}
                    className={`rounded-full px-3 py-2 text-[11px] font-medium ${step === index ? 'bg-blue-300 text-blue-950' : 'bg-slate-900 text-slate-400'}`}
                  >
                    {index}. {item[0]}
                  </button>
                ))}
              </div>
              <div className="mt-4 border-l-2 border-primary pl-3">
                <p className="text-xs font-bold text-slate-200">
                  {steps[step][1]}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                  {steps[step][2]}
                </p>
              </div>
            </div>
          </LessonSection>
          <LessonSection
            active={lessonStep === 3}
            number="04"
            title="volatile 修复了什么，又没修复什么"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/7 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                  <CheckCircle2 className="size-4" />
                  它提供
                </p>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                  <li>· 写入对后续读取的可见性</li>
                  <li>· 围绕 volatile 读写的有序性约束</li>
                  <li>· 单次读、单次写本身的原子性</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-400/20 bg-red-400/7 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-red-300">
                  <X className="size-4" />
                  它不提供
                </p>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                  <li>· count++ 复合操作的原子性</li>
                  <li>· 多个字段共同维护不变量</li>
                  <li>· 通用的互斥临界区</li>
                </ul>
              </div>
            </div>
            <pre className="code-block mt-4">
              <code>{`private volatile boolean running = true;\n// volatile write happens-before 后续对同一变量的 volatile read`}</code>
            </pre>
          </LessonSection>
          <LessonSection
            active={lessonStep === 4}
            number="05"
            title="业务决策：volatile 还是锁？"
          >
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70 text-muted-foreground">
                  <tr>
                    <th className="p-3">问题形态</th>
                    <th className="p-3">优先工具</th>
                    <th className="hidden p-3 sm:table-cell">理由</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-3">一个开关，多读单写</td>
                    <td className="p-3 font-bold text-primary">volatile</td>
                    <td className="hidden p-3 text-muted-foreground sm:table-cell">
                      只需要发布最新值
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3">余额 ≥ 扣减额后再扣减</td>
                    <td className="p-3 font-semibold text-amber-700 dark:text-amber-300">
                      锁 / 原子更新
                    </td>
                    <td className="hidden p-3 text-muted-foreground sm:table-cell">
                      检查与更新必须保持不变量
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3">不可变配置整体替换</td>
                    <td className="p-3 font-semibold text-emerald-700 dark:text-emerald-300">
                      volatile 引用
                    </td>
                    <td className="hidden p-3 text-muted-foreground sm:table-cell">
                      安全发布完整快照
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </LessonSection>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              disabled={lessonStep === 0}
              onClick={() => setLessonStep(Math.max(0, lessonStep - 1))}
            >
              <ArrowLeft /> 上一步
            </Button>
            {lessonStep < lessonChapters.length - 1 && (
              <Button
                variant="secondary"
                onClick={() => setLessonStep(lessonStep + 1)}
              >
                下一步 <ArrowRight />
              </Button>
            )}
          </div>
          <div
            className={`${lessonStep === 4 ? 'm3-page-enter' : 'hidden'} m3-surface-tonal p-5`}
          >
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="grid size-11 place-items-center rounded-full bg-secondary text-secondary-foreground">
                <ListChecks />
              </div>
              <div className="flex-1">
                <h3 className="m3-title">通关检查</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  我能指出数据竞争，画出 happens-before
                  边，并解释为什么“本地跑了 100 次都正常”不是证明。
                </p>
              </div>
              <Button onClick={finish}>
                {done ? (
                  <>
                    <Check />
                    已掌握
                  </>
                ) : (
                  <>
                    标记掌握 <Check />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
          <div className="m3-surface p-4">
            <p className="m3-label">本课路线</p>
            {lessonChapters.map((item, index) => (
              <button
                key={item}
                onClick={() => setLessonStep(index)}
                className={`mt-1 flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${lessonStep === index ? 'bg-secondary' : 'hover:bg-muted'}`}
              >
                <span
                  className={`grid size-6 place-items-center rounded-full text-[10px] font-medium ${lessonStep === index ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {index + 1}
                </span>
                <span className="text-xs">{item}</span>
              </button>
            ))}
          </div>
          <div className="m3-surface-tonal p-4">
            <Lightbulb className="size-5 text-primary" />
            <p className="mt-3 text-xs font-bold">关键名词</p>
            <button
              onClick={() => open('glossary')}
              className="mt-2 text-left text-xs leading-5 text-muted-foreground underline decoration-dotted underline-offset-4"
            >
              happens-before、数据竞争、安全发布、原子性
            </button>
          </div>
          <div className="m3-surface p-4">
            <p className="text-xs font-bold">下一步</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              去实验室观察丢失更新，比较 volatile、synchronized 与
              AtomicInteger。
            </p>
            <Button
              onClick={() => open('lab')}
              variant="outline"
              className="mt-3 w-full"
            >
              进入实验室 <ArrowRight />
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}

function LabView({ pendingExerciseId }: { pendingExerciseId: string | null }) {
  const [lab, setLab] = useState<'code' | 'counter' | 'pool' | 'virtual'>(
    'code',
  );
  return (
    <>
      <PageIntro
        eyebrow="并发实验室"
        title="先下注，再观察，再解释。"
        description="预测只是开始。你还需要亲手补全 Java 代码、接受自动反馈，再进入真实 JDK 21 运行与并发测试。"
      />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {(
          [
            ['code', '代码工坊', Code2],
            ['counter', '丢失更新', Binary],
            ['pool', '线程池容量', Gauge],
            ['virtual', '虚拟线程', Network],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setLab(id)}
            className={`flex min-w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-medium transition-colors ${lab === id ? 'bg-[var(--surface-container-lowest)] text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>
      {lab === 'code' && <CodeWorkshop pendingId={pendingExerciseId} />}
      {lab === 'counter' && <CounterLab />}
      {lab === 'pool' && <PoolLab />}
      {lab === 'virtual' && <VirtualThreadLab />}
    </>
  );
}

type CodeCheckResult = {
  id: string;
  label: string;
  failure: string;
  passed: boolean;
};

function CodeWorkshop({ pendingId }: { pendingId: string | null }) {
  const [exerciseId, setExerciseId] = useState(
    pendingId ?? codeExercises[0].id,
  );
  const exercise = codeExercises.find((item) => item.id === exerciseId)!;
  const [code, setCode] = useState(exercise.starter);
  const [results, setResults] = useState<CodeCheckResult[] | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [legacyDraft, setLegacyDraft] = useState<string | null>(null);

  const draftKey = (item: typeof exercise) =>
    `code-draft-v${item.revision ?? 1}:${item.id}`;

  useEffect(() => {
    const saved = window.localStorage.getItem(draftKey(exercise));
    if (saved) setCode(saved);
    setLegacyDraft(window.localStorage.getItem(`code-draft-v1:${exercise.id}`));
    const completedRaw = window.localStorage.getItem('java-verified-v2');
    if (completedRaw) {
      try {
        const parsed = JSON.parse(completedRaw);
        if (Array.isArray(parsed))
          setCompleted(parsed.filter((id) => typeof id === 'string'));
      } catch {}
    }
  }, []);

  // 外部（例如课程终点页）直接点名练习时跟随
  useEffect(() => {
    if (pendingId && pendingId !== exerciseId) {
      const next = codeExercises.find((item) => item.id === pendingId);
      if (next) {
        setExerciseId(pendingId);
        setCode(window.localStorage.getItem(draftKey(next)) ?? next.starter);
        setLegacyDraft(null);
        setResults(null);
        setAttempts(0);
        setHintLevel(0);
        setShowSolution(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId]);

  const chooseExercise = (id: string) => {
    const next = codeExercises.find((item) => item.id === id)!;
    setExerciseId(id);
    setCode(window.localStorage.getItem(draftKey(next)) ?? next.starter);
    setLegacyDraft(
      next.revision === 2
        ? window.localStorage.getItem(`code-draft-v1:${next.id}`)
        : null,
    );
    setResults(null);
    setAttempts(0);
    setHintLevel(0);
    setShowSolution(false);
  };

  const updateCode = (value: string) => {
    setCode(value);
    setResults(null);
    window.localStorage.setItem(draftKey(exercise), value);
  };

  const runChecks = () => {
    const nextResults = exercise.checks.map((check) => ({
      id: check.id,
      label: check.label,
      failure: check.failure,
      passed: new RegExp(check.pattern, check.flags).test(code),
    }));
    setResults(nextResults);
    setAttempts(attempts + 1);
  };

  const recordVerified = () => {
    const nextCompleted = completed.includes(exercise.id)
      ? completed
      : [...completed, exercise.id];
    setCompleted(nextCompleted);
    window.localStorage.setItem(
      'java-verified-v2',
      JSON.stringify(nextCompleted),
    );
  };

  const passed = results?.filter((result) => result.passed).length ?? 0;
  const allPassed = results?.every((result) => result.passed) ?? false;

  return (
    <div className="grid gap-3">
      <aside className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="m3-surface p-3">
          <p className="m3-label px-2 pt-1">M01 代码任务</p>
          <div className="mt-3 grid gap-1 sm:grid-cols-3">
            {codeExercises.map((item, index) => {
              const done = completed.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => chooseExercise(item.id)}
                  className={`w-full rounded-xl p-3 text-left transition-colors ${exercise.id === item.id ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      TASK {index + 1}
                    </span>
                    {done && (
                      <span title="曾通过服务器行为验收（本浏览器记录）">
                        <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-300" />
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-bold leading-5">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {item.difficulty}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
        <div className="m3-surface-tonal p-4 text-xs leading-5 text-muted-foreground">
          <p className="font-semibold text-foreground">
            {exercise.revision === 2
              ? '第一题：增加真实行为测试'
              : '当前判题级别：结构自检'}
          </p>
          <p className="mt-2">
            {exercise.revision === 2
              ? '可下载当前代码与测试，在 IDEA / JDK 21 中编译、运行和验收。在线执行取决于隔离服务是否连接。'
              : '只匹配关键写法，不解析完整控制流，也不编译或执行代码。这两题的行为测试会随后补充。'}
          </p>
        </div>
      </aside>

      <section className="m3-surface min-w-0 overflow-hidden">
        <div className="border-b border-border p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{exercise.module}</Badge>
            <Badge variant="outline">{exercise.difficulty}</Badge>
          </div>
          <h2 className="m3-title mt-3 text-xl">{exercise.title}</h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            {exercise.scenario}
          </p>
          <div className="mt-3 rounded-lg bg-muted p-3 text-xs">
            <strong>验收目标：</strong>
            {exercise.objective}
          </div>
          {legacyDraft && exercise.revision === 2 && (
            <details className="mt-3 text-xs leading-6 text-muted-foreground">
              <summary className="cursor-pointer font-medium">
                已保留第 1 版草稿 · 新版改为补全可测试的方法
              </summary>
              <p className="mt-2">
                可以把旧草稿中的启动、等待逻辑复制到新版 validateAndAwait
                方法中。旧草稿不会被新版本覆盖。
              </p>
              <pre className="code-block mt-2 max-h-64 overflow-auto">
                <code>{legacyDraft}</code>
              </pre>
            </details>
          )}
        </div>
        <div className="bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-2.5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
              <Code2 className="size-3.5 text-cyan-300" />
              {exercise.filename}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
              <span>Java 联想</span>
              <span>括号补全</span>
              <span className="font-mono text-cyan-300/80">Ctrl+Space</span>
              <span>草稿自动保存</span>
            </div>
          </div>
          <JavaCodeEditor
            value={code}
            exerciseId={exercise.id}
            onChange={updateCode}
          />
          <div
            id="java-editor-help"
            className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-800 px-4 py-2 text-[10px] text-slate-500"
          >
            <span className="text-emerald-300/80">● Java 语法高亮</span>
            <span>实时教学提示</span>
            <span>Tab 缩进 · Ctrl+Space 联想</span>
            <span className="ml-auto text-amber-300/70">
              编辑器提示 ≠ 编译结果
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
          <button
            onClick={() => updateCode(exercise.starter)}
            className="text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1 inline size-3.5" />
            恢复初始代码
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setHintLevel(Math.min(hintLevel + 1, exercise.hints.length))
              }
            >
              <Lightbulb />
              获取提示
            </Button>
            <Button variant="outline" onClick={runChecks}>
              <ListChecks />
              结构自检
            </Button>
          </div>
        </div>
      </section>

      {exercise.revision === 2 && (
        <JavaExecutionPanel
          key={exercise.id}
          exerciseId={exercise.id}
          code={code}
          onAttempt={() => setAttempts((value) => value + 1)}
          onVerified={recordVerified}
        />
      )}

      <aside className="grid items-start gap-3 lg:grid-cols-3">
        <div className="m3-surface p-4">
          <div className="flex items-center justify-between">
            <p className="m3-label">结构自检 · 不计为完成</p>
            <span
              className={`font-mono text-xs font-semibold ${allPassed ? 'text-emerald-700 dark:text-emerald-300' : 'text-primary'}`}
            >
              {passed}/{exercise.checks.length}
            </span>
          </div>
          <div className="mt-3 divide-y divide-border">
            {(
              results ??
              exercise.checks.map((check) => ({ ...check, passed: false }))
            ).map((result) => (
              <div
                key={result.id}
                className={`py-3 ${results && !result.passed ? 'text-red-800 dark:text-red-200' : ''}`}
              >
                <div className="flex gap-2 text-xs font-medium">
                  {results ? (
                    result.passed ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
                    ) : (
                      <X className="mt-0.5 size-4 shrink-0 text-red-700 dark:text-red-300" />
                    )
                  ) : (
                    <span className="mt-0.5 size-4 shrink-0 rounded-full border border-border" />
                  )}
                  {result.label}
                </div>
                {results && !result.passed && (
                  <p className="mt-2 pl-6 text-[10px] leading-5 text-muted-foreground">
                    {result.failure}
                  </p>
                )}
              </div>
            ))}
          </div>
          {allPassed && (
            <div className="mt-4 rounded-xl bg-emerald-100 p-3 text-xs leading-5 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              <strong>结构校验通过。</strong>这说明关键写法齐全，但必须等真实
              Java 21 编译、测试和运行通过后，才算代码题完成。
            </div>
          )}
        </div>

        {hintLevel > 0 && (
          <div className="m3-surface-tonal p-4">
            <p className="text-xs font-semibold text-foreground">
              分级提示 {hintLevel}/{exercise.hints.length}
            </p>
            <div className="mt-3 space-y-2">
              {exercise.hints.slice(0, hintLevel).map((hint, index) => (
                <p
                  key={hint}
                  className="text-xs leading-5 text-muted-foreground"
                >
                  <strong className="text-primary">{index + 1}.</strong> {hint}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="m3-surface p-4">
          <button
            disabled={attempts < 2}
            onClick={() => setShowSolution(!showSolution)}
            className="flex w-full items-center justify-between text-left text-xs font-bold disabled:cursor-not-allowed disabled:text-muted-foreground"
          >
            <span>参考实现</span>
            <span className="text-[10px]">
              {attempts < 2
                ? `再尝试 ${2 - attempts} 次解锁`
                : showSolution
                  ? '收起'
                  : '查看'}
            </span>
          </button>
          {showSolution && (
            <pre className="code-block mt-4 max-h-80 overflow-auto">
              <code>{exercise.solution}</code>
            </pre>
          )}
        </div>
      </aside>
    </div>
  );
}

function CounterLab() {
  const [mode, setMode] = useState<'unsafe' | 'volatile' | 'lock' | 'atomic'>(
    'unsafe',
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const run = () => {
    setRunning(true);
    setResult(null);
    window.setTimeout(() => {
      setRunning(false);
      setResult(mode === 'unsafe' || mode === 'volatile' ? 17842 : 20000);
    }, 650);
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <Badge className="bg-red-400/10 text-red-300">RACE CONDITION</Badge>
            <h2 className="mt-3 font-heading text-xl font-semibold">
              两个线程各自执行 10,000 次 count++
            </h2>
          </div>
          <Cpu
            className={`size-8 text-primary ${running ? 'animate-pulse' : ''}`}
          />
        </div>
        <pre className="code-block mt-5">
          <code>{`${mode === 'volatile' ? 'volatile ' : ''}int count = 0;\n\nThread.ofPlatform().start(() -> repeat(10_000, () -> count++));\nThread.ofPlatform().start(() -> repeat(10_000, () -> count++));`}</code>
        </pre>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ['unsafe', '无同步'],
              ['volatile', 'volatile'],
              ['lock', 'synchronized'],
              ['atomic', 'AtomicInteger'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setMode(id);
                setResult(null);
              }}
              className={`rounded-xl border p-3 text-xs font-bold ${mode === id ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button onClick={run} disabled={running} className="mt-4 rounded-xl">
          {running ? (
            <>
              <RefreshCw className="animate-spin" />
              采样交错执行...
            </>
          ) : (
            <>
              <Play />
              运行 100 组模拟轨迹
            </>
          )}
        </Button>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          观测结果
        </p>
        <div className="my-7 text-center">
          <p className="font-mono text-5xl font-semibold text-primary">
            {result ?? '—'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">期望值 20,000</p>
        </div>
        {result && (
          <div
            className={`rounded-xl border p-4 ${result === 20000 ? 'border-emerald-400/20 bg-emerald-400/7' : 'border-red-400/20 bg-red-400/7'}`}
          >
            <p className="text-sm font-bold">
              {result === 20000
                ? '这组操作已原子化'
                : `丢失了 ${20000 - result} 次更新`}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {mode === 'volatile'
                ? 'volatile 让读写可见，但无法把 read-modify-write 合成一个原子动作。'
                : result === 20000
                  ? '互斥或 CAS 重试保护了复合更新。接下来还要比较竞争下的代价。'
                  : '多个线程读取了同一旧值，后写入者覆盖了先写入者的结果。'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="m3-surface-tonal p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function PoolLab() {
  const [arrival, setArrival] = useState(120),
    [latency, setLatency] = useState(180),
    [threads, setThreads] = useState(24);
  const required = Math.ceil((arrival * latency) / 1000),
    utilization = Math.round((required / threads) * 100),
    state = utilization > 100 ? '过载' : utilization > 80 ? '危险' : '健康';
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-xl border border-border bg-card p-5">
        <Badge className="bg-amber-300/12 text-amber-200">LITTLE'S LAW</Badge>
        <h2 className="mt-3 font-heading text-xl font-semibold">
          用流量与等待时间给线程池算账
        </h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          估算 I/O 型任务的并发在途量：N ≈ 到达率 λ × 平均响应时间
          W。它是起点，不是拍脑袋的最终参数。
        </p>
        <Range
          label="到达率"
          value={arrival}
          min={20}
          max={400}
          unit="req/s"
          onChange={setArrival}
        />
        <Range
          label="下游平均耗时"
          value={latency}
          min={20}
          max={1000}
          unit="ms"
          onChange={setLatency}
        />
        <Range
          label="核心线程数"
          value={threads}
          min={4}
          max={128}
          unit="threads"
          onChange={setThreads}
        />
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          容量快照
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label="估算在途" value={`${required}`} />
          <Metric label="池内线程" value={`${threads}`} />
        </div>
        <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">估算利用率</span>
            <span
              className={`text-sm font-semibold ${state === '健康' ? 'text-emerald-300' : state === '危险' ? 'text-amber-300' : 'text-red-300'}`}
            >
              {utilization}% · {state}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`${state === '健康' ? 'bg-emerald-400' : state === '危险' ? 'bg-amber-300' : 'bg-red-400'} h-full rounded-full`}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/7 p-4 text-xs leading-6 text-muted-foreground">
          <strong className="text-primary">生产校准：</strong>
          还要叠加峰值系数、连接池上限、队列等待 SLO、CPU
          与内存预算。线程池不是下游限流器；容量必须与整个调用链一起算。
        </div>
      </div>
    </div>
  );
}
function VirtualThreadLab() {
  const [model, setModel] = useState<'platform' | 'virtual'>('platform'),
    [requests, setRequests] = useState(200);
  const carriers =
    model === 'platform'
      ? Math.min(requests, 32)
      : Math.min(8, Math.ceil(requests / 40));
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge className="bg-primary/12 text-primary">JDK 21 · JEP 444</Badge>
          <h2 className="mt-3 font-heading text-xl font-semibold">
            同样的阻塞式代码，不同的线程成本
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
            虚拟线程提高的是高并发 I/O
            工作负载的吞吐能力，不会让单个任务执行更快。
          </p>
        </div>
        <div className="flex rounded-xl border border-border bg-background/40 p-1">
          {(
            [
              ['platform', '平台线程'],
              ['virtual', '虚拟线程'],
            ] as const
          ).map(([id, label]) => (
            <button
              onClick={() => setModel(id)}
              key={id}
              className={`rounded-lg px-3 py-2 text-xs font-bold ${model === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <Range
        label="并发 I/O 请求"
        value={requests}
        min={20}
        max={1000}
        unit="tasks"
        onChange={setRequests}
      />
      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px]">
        <div className="rounded-xl border border-border bg-slate-950/50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            调度视图
          </p>
          <div className="mt-4 flex min-h-40 flex-wrap content-start gap-1.5">
            {Array.from({ length: Math.min(requests, 120) }).map((_, index) => (
              <span
                key={index}
                className={`h-3 rounded-sm ${model === 'virtual' ? 'w-3 bg-cyan-300/70' : 'w-6 bg-amber-300/70'}`}
              />
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-500">
            每个方块代表
            {model === 'virtual'
              ? '一个任务/虚拟线程'
              : '一个被池化的平台线程任务'}
          </p>
        </div>
        <div className="space-y-3">
          <Metric label="任务数" value={`${requests}`} />
          <Metric
            label={model === 'virtual' ? '估算载体线程' : '平台线程上限'}
            value={`${carriers}`}
          />
          <div
            className={`rounded-xl border p-4 text-xs leading-5 ${model === 'virtual' ? 'border-primary/20 bg-primary/7' : 'border-amber-300/20 bg-amber-300/7'}`}
          >
            {model === 'virtual'
              ? '阻塞 I/O 时虚拟线程通常卸载，载体线程可执行其他任务。仍要尊重数据库连接池和下游容量。'
              : '平台线程在阻塞期间占住 OS 线程，池外任务排队；池过大会增加调度与内存成本。'}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewView({
  reviewed,
  setReviewed,
  open,
}: {
  reviewed: number;
  setReviewed: (n: number) => void;
  open: (v: View) => void;
}) {
  const [index, setIndex] = useState(
      Math.min(reviewed, reviewCards.length - 1),
    ),
    [flipped, setFlipped] = useState(false),
    [finished, setFinished] = useState(reviewed >= reviewCards.length);
  const card = reviewCards[index];
  const rate = () => {
    const next = index + 1;
    setReviewed(Math.max(reviewed, next));
    setFlipped(false);
    if (next >= reviewCards.length) setFinished(true);
    else setIndex(next);
  };
  if (finished)
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-xl bg-emerald-400/12 text-emerald-300">
          <Trophy className="size-8" />
        </div>
        <h1 className="mt-6 font-heading text-3xl font-semibold">
          今天的记忆债已清空
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          6 张卡片已重新调度。明天只会出现接近遗忘边缘的内容。
        </p>
        <Button onClick={() => open('dashboard')} className="mt-6 rounded-xl">
          返回学习台
        </Button>
      </div>
    );
  return (
    <>
      <PageIntro
        eyebrow={`间隔复习 · ${index + 1}/${reviewCards.length}`}
        title="先从记忆中提取，再看答案。"
        description="“想不起来”的那几秒不是失败，而是记忆真正变强的地方。"
      />
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex justify-between text-[10px] text-muted-foreground">
          <span>本轮进度</span>
          <span>
            {index + 1} / {reviewCards.length}
          </span>
        </div>
        <Progress
          value={((index + 1) / reviewCards.length) * 100}
          className="mb-6 [&_[data-slot=progress-track]]:h-1.5"
        />
        <button
          onClick={() => setFlipped(!flipped)}
          className="m3-surface min-h-[330px] w-full p-7 text-left sm:p-10"
        >
          <div className="flex items-center justify-between">
            <Badge className="bg-primary/12 text-primary">{card.tag}</Badge>
            <RefreshCw
              className={`size-4 text-muted-foreground transition ${flipped ? 'rotate-180' : ''}`}
            />
          </div>
          {!flipped ? (
            <div className="flex min-h-56 flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                问题
              </p>
              <h2 className="mt-4 font-heading text-2xl font-semibold leading-tight sm:text-3xl">
                {card.question}
              </h2>
              <p className="mt-8 text-xs text-muted-foreground">
                先在心里说出答案，然后点击卡片
              </p>
            </div>
          ) : (
            <div className="flex min-h-56 flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                参考答案
              </p>
              <p className="mt-4 text-base leading-8 text-foreground">
                {card.answer}
              </p>
            </div>
          )}
        </button>
        {flipped && (
          <div className="mt-5">
            <p className="mb-3 text-center text-xs font-bold text-muted-foreground">
              刚才回忆得怎么样？
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={rate}
                variant="outline"
                className="h-11 rounded-xl border-red-400/20 text-red-300"
              >
                忘了 · 1天
              </Button>
              <Button
                onClick={rate}
                variant="outline"
                className="h-11 rounded-xl border-amber-300/20 text-amber-200"
              >
                模糊 · 3天
              </Button>
              <Button
                onClick={rate}
                variant="outline"
                className="h-11 rounded-xl border-emerald-400/20 text-emerald-300"
              >
                记得 · 7天
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ProjectView() {
  const [milestone, setMilestone] = useState(0);
  const selected = capstoneMilestones[milestone];
  return (
    <>
      <PageIntro
        eyebrow="CAPSTONE · FlashFlow"
        title="一次完成一个工程里程碑"
        description="高并发订单履约服务 · Spring Boot + Java 21。每一步先制造故障，再建立不变量并提交验证证据。"
      />
      <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="m3-surface p-3">
          <p className="m3-label px-2 py-2">7 个里程碑</p>
          <div className="space-y-1">
            {capstoneMilestones.map(([index, title], itemIndex) => (
              <button
                key={index}
                onClick={() => setMilestone(itemIndex)}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${milestone === itemIndex ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${milestone === itemIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {index}
                </span>
                <span className="text-xs font-medium">{title}</span>
              </button>
            ))}
          </div>
        </aside>
        <article
          key={milestone}
          className="m3-page-enter m3-surface p-6 sm:p-8"
        >
          <Badge variant="secondary">里程碑 {selected[0]}</Badge>
          <h2 className="m3-title mt-5 text-2xl">{selected[1]}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            {selected[2]}
          </p>
          <p className="mt-5 rounded-lg bg-muted p-3 font-mono text-xs text-primary">
            {selected[3]}
          </p>
          <div className="mt-7 border-t border-border pt-5">
            <p className="m3-label">本阶段验收</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                ['正确性证据', '不变量、测试与失败反例'],
                ['性能证据', '基准、压测与资源预算'],
                ['可观测性', '指标、日志与 JFR 事件'],
                ['韧性验证', '超时、拒绝、降级和故障注入'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-lg bg-muted p-4">
                  <p className="text-xs font-semibold">{title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              disabled={milestone === 0}
              onClick={() => setMilestone(milestone - 1)}
            >
              <ArrowLeft /> 上一个
            </Button>
            {milestone < capstoneMilestones.length - 1 && (
              <Button
                variant="secondary"
                onClick={() => setMilestone(milestone + 1)}
              >
                下一个 <ArrowRight />
              </Button>
            )}
          </div>
        </article>
      </div>
      <details className="m3-surface mt-4 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          查看 FlashFlow 架构与故障注入范围
        </summary>
        <div className="m3-expand-enter mt-4 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1.2fr_auto_1.2fr]">
          <ArchitectureNode
            icon={Activity}
            title="API 入口"
            items={['幂等键', '有界接纳', '请求截止时间']}
          />
          <FlowArrow />
          <ArchitectureNode
            icon={ServerCog}
            title="订单编排器"
            items={['任务树', '取消传播', '舱壁隔离']}
            featured
          />
          <FlowArrow />
          <ArchitectureNode
            icon={Database}
            title="依赖资源"
            items={['库存库', '支付网关', '物流服务']}
          />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Risk label="超卖" color="red" />
          <Risk label="线程饥饿" color="amber" />
          <Risk label="下游级联" color="violet" />
        </div>
      </details>
    </>
  );
}
function GlossaryView() {
  const [query, setQuery] = useState('');
  const filtered = glossary.filter(([term, definition]) =>
    `${term}${definition}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageIntro
        eyebrow="名词词典"
        title="把术语还原成可操作的判断。"
        description="每个定义都回答：它约束什么、不能保证什么、在业务代码里什么时候会遇到。"
      />
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索 happens-before、背压、Pinning..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map(([term, definition], index) => (
          <article
            key={term}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between">
              <h2 className="font-mono text-sm font-bold text-primary">
                {term}
              </h2>
              <span className="text-[10px] text-muted-foreground">
                #{String(index + 1).padStart(2, '0')}
              </span>
            </div>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              {definition}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="m3-label mb-2 flex items-center gap-2 text-primary">
          {eyebrow}
        </p>
        <h1 className="m3-title max-w-4xl text-[1.75rem] leading-tight sm:text-[2rem]">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
function SectionTitle({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-4 mt-8 flex items-end justify-between">
      <div>
        <h2 className="m3-title text-xl">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      {action && (
        <button
          onClick={onAction}
          className="hidden rounded-full px-3 py-2 text-xs font-medium text-primary hover:bg-accent sm:block"
        >
          {action}
        </button>
      )}
    </div>
  );
}
function LessonSection({
  number,
  title,
  children,
  active = true,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <section
      className={`${active ? 'm3-page-enter' : 'hidden'} m3-surface p-5 sm:p-6`}
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
          {number}
        </span>
        <h2 className="m3-title text-xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}
function MiniCard({
  icon: Icon,
  title,
  text,
}: {
  icon: IconType;
  title: string;
  text: string;
}) {
  return (
    <div className="m3-surface-tonal p-3">
      <Icon className="size-4 text-primary" />
      <p className="mt-3 text-xs font-semibold">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}
function ThreadBox({
  name,
  value,
  active,
  tone,
}: {
  name: string;
  value: string;
  active: boolean;
  tone: 'cyan' | 'amber';
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition ${active ? (tone === 'cyan' ? 'border-cyan-300/60 bg-cyan-300/8' : 'border-amber-300/60 bg-amber-300/8') : 'border-slate-800 bg-slate-950/60'}`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-widest ${tone === 'cyan' ? 'text-cyan-300' : 'text-amber-300'}`}
      >
        {name}
      </p>
      <p className="mt-4 font-mono text-xs text-slate-200">{value}</p>
    </div>
  );
}
function Range({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="mt-6 block">
      <span className="flex items-center justify-between text-xs font-bold">
        <span>{label}</span>
        <span className="font-mono text-primary">
          {value} {unit}
        </span>
      </span>
      <input
        className="range mt-3 w-full"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
function ArchitectureNode({
  icon: Icon,
  title,
  items,
  featured,
}: {
  icon: IconType;
  title: string;
  items: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${featured ? 'bg-secondary text-secondary-foreground' : 'bg-muted'}`}
    >
      <Icon
        className={`size-5 ${featured ? 'text-primary' : 'text-muted-foreground'}`}
      />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <div className="mt-3 space-y-1">
        {items.map((item) => (
          <p key={item} className="text-[10px] text-muted-foreground">
            · {item}
          </p>
        ))}
      </div>
    </div>
  );
}
function FlowArrow() {
  return (
    <div className="hidden items-center text-primary lg:flex">
      <ArrowRight className="size-5" />
    </div>
  );
}
function Risk({
  label,
  color,
}: {
  label: string;
  color: 'red' | 'amber' | 'violet';
}) {
  const colors = {
    red: 'border-red-400/20 bg-red-400/7 text-red-300',
    amber: 'border-amber-300/20 bg-amber-300/7 text-amber-200',
    violet: 'border-violet-400/20 bg-violet-400/7 text-violet-300',
  };
  return (
    <div
      className={`rounded-lg border p-2 text-center text-[10px] font-bold ${colors[color]}`}
    >
      <AlertTriangle className="mr-1 inline size-3" />
      故障注入：{label}
    </div>
  );
}

function LessonDispatcher({
  lessonId,
  completed,
  setCompleted,
  open,
  openLab,
}: {
  lessonId: string | null;
  completed: string[];
  setCompleted: (v: string[]) => void;
  open: (v: View, lessonId?: string) => void;
  openLab?: (exerciseId: string) => void;
}) {
  const entry = lessonId ? getLesson(lessonId) : null;
  if (!entry) {
    return (
      <LessonView
        completed={completed}
        setCompleted={setCompleted}
        open={open}
      />
    );
  }
  const id = entry.meta.id;
  const done = completed.includes(id);
  // 故事线课程（新法）：优先用 StoryLessonPage；否则回落到老的 LessonPage 骨架。
  if (entry.steps) {
    return (
      <StoryLessonPage
        meta={{
          moduleTitle: entry.meta.moduleTitle,
          moduleIndex: entry.meta.moduleIndex,
          title: entry.meta.title,
          subtitle: entry.meta.subtitle,
          minutes: entry.meta.minutes,
          level: entry.meta.level,
          id: entry.meta.id,
          exerciseId: entry.meta.exerciseId,
        }}
        steps={entry.steps}
        done={done}
        onDone={() => {
          if (!done) setCompleted([...completed, id]);
        }}
        open={open}
        openLab={openLab}
      />
    );
  }
  if (!entry.Body) return null;
  const Body = entry.Body;
  return (
    <LessonPage
      entry={{ meta: entry.meta, Body }}
      order={lessonNav(id)}
      done={done}
      onDone={() => {
        if (!done) setCompleted([...completed, id]);
      }}
      open={open}
    />
  );
}
