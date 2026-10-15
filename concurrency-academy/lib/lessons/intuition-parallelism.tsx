// M00-3 · 并发不等于并行（误区 + 压测直觉）
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
import { CpuLanes } from '@/components/lesson/animations';
import type { LessonComponent, LessonMeta } from '@/components/lesson/lesson-page';

export const meta: LessonMeta = {
  id: 'intuition:concurrency-parallelism',
  moduleId: 'intuition',
  moduleIndex: '01',
  moduleTitle: '建立并发直觉',
  title: '并发不等于并行',
  subtitle: '它们只差一个字，错误地混用它们却低不了——这正是压测结果永远对不上直觉的原因。',
  kind: '实验',
  minutes: 16,
  level: '基础',
  outcomes: ['用“并发 vs 并行”定位压测偏差', '说清单核上“并行”只会虚張', '给任务选执行模型第一步先问“等不等”'],
};

const Body: LessonComponent = () => (
  <div className="space-y-4">
    <Section number="01" title="同一个核，看两种世界">
      <P>
        一台单核机器上两个线程——它们并不是真的同时推进，而是操作系统在它们之间快速换装。
        从单独一个线程看「我一直在跑，只是变慢了」；从整机看总吞吐不变，但两个任务的延迟都变长了。
      </P>
      <P>
        这就是<em>并发但不并行</em>。换成 8 核，「两者真正同步运行」才可能发生——那就是<em>并行</em>。
      </P>
      <Callout variant="idea">
        并发是软件面对「很多件不同的事」都能从容应付的指法；并行是 CPU 的选择题，不是默认属性。
        <strong className="text-foreground">开着几百个线程不等于并行不代表快——大多数时候只是大家都在等。</strong>
      </Callout>
    </Section>

    <Section number="02" title="看 CPU 分核怎么干活">
      <CpuLanes />
      <P>
        把这两张图放一起比：单核换装 vs 多核各占一山。注意第二张图里两个任务不顺序也不交叉——各自的自由行进。
        <strong className="text-foreground">以后遇到「并发和并行」混用的追问，回它这张图。</strong>
      </P>
    </Section>

    <Section number="03" title="实验：让两个线程『抢丝剂』给你看">
      <P>
        下面这段代码会高亮一个反直觉：在浏览器 JVM 里，<Code>join</Code> 是完整地等，而不是时间切片式地分颗心。
        两个线程互掐进进出出 —— 如果看成了「同步执行」，那是错觉。
      </P>
      <CodeLab
        title="两个交叉打印的线程"
        moduleId="intuition-parallelism"
        starterCode={`public class Main {
    public static void main(String[] args) throws Exception {
        Runnable r = () -> {
            for (int i = 0; i < 5; i++) {
                System.out.println(Thread.currentThread().getName() + " tick " + i);
                try { Thread.sleep(50); } catch (InterruptedException e) { return; }
            }
        };
        Thread a = new Thread(r, "A");
        Thread b = new Thread(r, "B");
        a.start(); b.start();
        a.join(); b.join();
        System.out.println("done");
    }
}`}
        expectedOutput="A tick 0 与 B tick 0 交替出现，先后顺序不稳定"
        note="多跑两次看主顺序是否变化。这就是什么叫『不确定的调度』——业务代码里你看到的就是行为，不是承诺。"
      />
    </Section>

    <Section number="04" title="时间线：画一次">
      <ThreadTimeline
        threads={[
          { id: 'a', label: 'A', accent: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100' },
          { id: 'b', label: 'B', accent: 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100' },
        ]}
        steps={[
          { title: '都在就绪', note: 'start 后两个线程都在可运行集合里，由调度器决定下一执行者。', marks: { a: 'RUNNABLE', b: 'RUNNABLE' } },
          { title: '交替推进', note: '并行=占用不同核；并发=在相同核上轮流。双核同核主体感完全不同，但行为上只有字典序不确定性。', marks: { a: 'RUNNABLE', b: 'RUNNABLE' } },
          { title: '汇合', note: '谁 join 谁等；join 完成前 main 睡眠。', marks: { a: 'TERMINATED', b: 'TERMINATED' } },
        ]}
      />
    </Section>

    <Section number="05" title="你的预测">
      <Predict
        question="上面那段代码在 8 核机器上跑一次，输出顺序会每次一成不变吗？"
        options={[
          {
            label: '不会，调度是不确定的——这才是并发代码的常态',
            correct: true,
            explain: 'JVM 从未向这种交替印字承诺顺序；今天顺序固定,明天硬件不一样就变了。要想顺序，就要同步。',
          },
          { label: '会，因为 sleep 固定切分', correct: false },
        ]}
      />
    </Section>
  </div>
);

const entry = { meta, Body };
export default entry;
