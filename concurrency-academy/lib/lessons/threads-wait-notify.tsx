// M01-3 · wait/notify 的条件队列（生产与守护）
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
import { QueueLane } from '@/components/lesson/animations';
import type { LessonComponent, LessonMeta } from '@/components/lesson/lesson-page';

export const meta: LessonMeta = {
  id: 'threads:wait-notify',
  moduleId: 'threads',
  moduleIndex: '02',
  moduleTitle: '线程协作',
  title: 'wait/notify 的条件队列',
  subtitle: '多线程协作最基础的『等待-唤醒』本来一步没有，怎么写都错——直到你记住那个 while 循环。',
  kind: '实验',
  minutes: 28,
  level: '进阶',
  outcomes: ['while 等待范式的三条铁律', '虚假唤醒与丢通知分别是什么', '会手写 Guarded Suspension'],
};

const Body: LessonComponent = () => (
  <div className="space-y-4">
    <Section number="01" title="等条件凑齐再动手">
      <P>
        后台服务里最经典的需求：<strong className="text-foreground">等某个条件变成真，再动手</strong>。
        消息队列空了就等，等到有消息了再消费。这就是 Guarded Suspension（保护性暂停）。
      </P>
      <P>
        wait/notify 就是为这件事设计的：条件没凑齐时，线程自己释放锁睡下不占 CPU；
        有人促成条件了，再喊它起来。<br />
        所以通知不能只发一次，wait 也必须写在 while 里——
        因为除了你期待的那次通知，还会有<em>虚假唤醒</em>。
      </P>
      <TermCard
        items={[
          ['条件队列', "Object.wait() 会让线程进这个锁对象的等待集合里睡眠；notifyAll 唤醒全部。"],
          ['虚假唤醒', '没有 notify 时线程也可能醒来——所以 while (条件不满足) wait 是唯一正确姿势。'],
          ['丢通知', '没人等的时候 notify 是打了空气；所以入队动作与等待动作一定要用同一把锁。'],
          ['Guarded Suspension', '「条件跑到真之前不许走」的写法套件。BlockingQueue 内部就是它。'],
        ]}
      />
    </Section>

    <Section number="02" title="时间线：生产与消费各一帧">
      <QueueLane />
      <ThreadTimeline
        threads={[
          { id: 'prod', label: 'producer', accent: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100' },
          { id: 'cons', label: 'consumer', accent: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100' },
        ]}
        steps={[
          { title: 'consumer 先看', note: '队里空 → 进 wait，释放锁', marks: { prod: 'RUNNABLE', cons: 'WAITING（锁已释放）' } },
          { title: 'producer 放消息', note: '同一锁内 put()，notifyAll()', marks: { prod: 'RUNNABLE', cons: 'WAITING' } },
          { title: 'notify 叫醒', note: 'consumer 被通知，但还要重新抢锁', marks: { prod: 'RUNNABLE', cons: 'BLOCKED → RUNNABLE' } },
          { title: 'consumer 重检条件', note: '回到 while 再看；条件这次真了才出循环。', marks: { prod: 'TERMINATED', cons: 'RUNNABLE 消费' } },
        ]}
      />
      <P>
        为什么 wait 必须放在 while（不是 if）？因为条件可能被抢了、被覆盖了、被「虚假唤醒」了，而 wait 返回后什么都不保证。
      </P>
    </Section>

    <Section number="03" title="实验：一个最简生产者-消费者">
      <CodeLab
        title="Wait-Notify 迷你队列"
        moduleId="threads-wait-notify"
        starterCode={`public class Main {
    static final Object lock = new Object();
    static String message = null;

    public static void main(String[] args) throws Exception {
        Thread producer = new Thread(() -> {
            synchronized (lock) {
                message = "hello";
                lock.notifyAll();
            }
        }, "producer");

        Thread consumer = new Thread(() -> {
            synchronized (lock) {
                while (message == null) {
                    try { lock.wait(); } catch (InterruptedException e) { return; }
                }
                System.out.println("got: " + message);
            }
        }, "consumer");

        consumer.start();
        Thread.sleep(300);   // 刻意让消费等住一下
        producer.start();
        producer.join();
        consumer.join();
        System.out.println("done");
    }
}`}
        expectedOutput={`got: hello\ndone`}
        note="这里是判分要点：synchronized 的范围必须覆盖「观察条件」和「修改条件」；而 wait 只能写在 synchronized 里，否则直接 IllegalMonitorStateException。"
      />
      <Callout variant="idea">
        提醒：在搜索框或任何面试里，wait/notify 最根本的那句话是 —
        <strong className="text-foreground">「先验，等；变亦要再验。」</strong>
        想尝试题库跳接去「并发实验室」看 M01·write-interrupt。
      </Callout>
    </Section>
  </div>
);

const entry = { meta, Body };
export default entry;
