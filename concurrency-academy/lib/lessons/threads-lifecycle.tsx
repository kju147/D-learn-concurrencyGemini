// M01-1 · 线程生命周期与状态转换（带真实运行实验）
'use client';

import {
  Callout,
  Code,
  CodeLab,
  P,
  Predict,
  Section,
  TermCard,
  ThreadTimeline,
} from '@/components/lesson/blocks';
import type { LessonComponent, LessonMeta } from '@/components/lesson/lesson-page';

export const meta: LessonMeta = {
  id: 'threads:lifecycle',
  moduleId: 'threads',
  moduleIndex: '02',
  moduleTitle: '线程协作',
  title: '线程生命周期与状态转换',
  subtitle: '看懂 jstack 的每一种状态，并且能用 Thread.getState() 在自己代码里复现。',
  kind: '概念+实验',
  minutes: 20,
  level: '基础',
  outcomes: ['线程六态都能说清', '会用 getState() 做诊断', '知道 start 是「发牌」不是「干活」'],
};

const Body: LessonComponent = () => (
  <div className="space-y-4">
    <Section number="01" title="六种 Java 状态">
      <P>
        Java 线程的状态机由 Language Spec 规定，分别是：
        <Code>NEW</Code>（创建了没启动）、<Code>RUNNABLE</Code>（但没在跑≠没闲着；含真正在 CPU 上
        和在等调度）、<Code>BLOCKED</Code>（等监视器锁）、<Code>WAITING</Code>（
        无期限等唤醒）、<Code>TIMED_WAITING</Code>（有期限等唤醒）、
        <Code>TERMINATED</Code>（死了）。
      </P>
      <P>
        很多人死记硬背这六个名字的对应 API。其实你只需要三句话：
        <strong className="text-foreground">
          「跑得动」的线 <Code>RUNNABLE</Code>；「等别的东西」的线分「等锁」（BLOCKED）和「等被叫醒」
          （WAITING/TIMED_WAITING）；死了是 TERMINATED，没 start 是 NEW。
        </strong>
      </P>
      <TermCard
        items={[
          ['线程状态 （Thread.State)', 'JVM 视角的状态标签；jstack 打印的就是它。'],
          ['上下文切换', 'OS 切换执行线程的保存/恢复现场，几微秒级。'],
          ['活跃性故障', '死锁、活锁、饥饿——都不是异常，是"永远卡住/永远在空转"。'],
        ]}
      />
    </Section>

    <Section number="02" title="时间线：两个线程抢着进临界区">
      <ThreadTimeline
        threads={[
          { id: 'a', label: 'worker-A', accent: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100' },
          { id: 'b', label: 'worker-B', accent: 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100' },
          { id: 'm', label: 'main', accent: 'bg-muted text-foreground' },
        ]}
        steps={[
          { title: 'both NEW', note: '只创建，没有 start。', marks: { a: 'NEW', b: 'NEW', m: 'RUNNABLE' } },
          { title: 'A 拿到锁', note: '先 start 的先抢到是常态但不保证。', marks: { a: 'RUNNABLE, in critical', b: 'RUNNABLE 要抢锁', m: 'RUNNABLE' } },
          { title: 'B 进 BLOCKED', note: 'synchronized 是「等锁」，不是「等唤醒」。', marks: { a: 'RUNNABLE 在临界区', b: 'BLOCKED (monitor)', m: 'RUNNABLE' } },
          { title: 'A 出锁，B 入', note: '释放锁 ⇒ B 可能抢到，也许没轮到。', marks: { a: 'RUNNABLE', b: 'RUNNABLE（从 BLOCKED 被释放了）', m: 'RUNNABLE' } },
          { title: 'join 汇合', note: 'main 等到两个都 TERMINATED。', marks: { a: 'TERMINATED', b: 'TERMINATED', m: '从 WAITING 回到 RUNNABLE' } },
        ]}
      />
      <Callout variant="warning">
        <Code>BLOCKED</Code> 只出现在 synchronized / 隐式锁、等监视器的时候；
        <Code>WAITING</Code>/<Code>TIMED_WAITING</Code> 是 sleep/wait/park 之类。命名看着像，行为差得远。
      </Callout>
    </Section>

    <Section number="03" title="实验：让代码真的演示状态">
      <P>
        下面这段在浏览器 JVM 里就能跑。两个线程靠 <Code>getState()</Code> 溜出对方的实时状态——
        诊断工具的底层数据结构就是这么来的。
      </P>
      <CodeLab
        title="观察状态机"
        moduleId="threads-lifecycle"
        starterCode={`public class Main {
    public static void main(String[] args) throws Exception {
        Thread worker = new Thread(() -> {
            long deadline = System.currentTimeMillis() + 400;
            while (System.currentTimeMillis() < deadline) {}
        }, "busy-bee");

        Thread statePrinter = new Thread(() -> {
            while (worker.getState() != Thread.State.TERMINATED) {
                System.out.println("bee -> " + worker.getState());
                try { Thread.sleep(80); } catch (InterruptedException e) { return; }
            }
            System.out.println("bee -> TERMINATED");
        }, "watcher");

        worker.start();
        statePrinter.start();
        worker.join();
        statePrinter.join();
        System.out.println("done");
    }
}`}
        expectedOutput={'bee -> RUNNABLE\nbee -> RUNNABLE\n...\ndone'}
        note="这一步学到了：主/工作线程的状态随时从 getState() 就能问出来；jstack 打的就是这张表。改一改：让 watcher 在 worker 活着时只打 5 次。"
      />
    </Section>

    <Section number="04" title="边界自测">
      <Predict
        question="如果一个线程已经 print 完自己的 run() 结尾，另一个线程去 start() 它，会怎样？"
        options={[
          {
            label: 'IllegalThreadStateException——不能对 TERMINATED 线程二次 start',
            correct: true,
            explain: 'JLS 如此规定。所以"启动"是一次性的；想重复执行就用线程池/新对象。',
          },
          { label: '会重新跑一遍 run()', correct: false },
        ]}
      />
      <Callout variant="idea">
        想真正掌握堵塞中断语义，现在就去做练习 <strong>M01·start/join</strong>。
      </Callout>
    </Section>
  </div>
);

const entry = { meta, Body };
export default entry;
