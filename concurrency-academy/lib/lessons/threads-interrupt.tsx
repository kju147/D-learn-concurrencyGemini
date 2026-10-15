// M01-2 · 中断不是强制停止 + join（协作式取消）
'use client';

import {
  Callout,
  Code,
  CodeLab,
  P,
  Predict,
  Section,
  TermCard,
} from '@/components/lesson/blocks';
import type { LessonComponent, LessonMeta } from '@/components/lesson/lesson-page';

export const meta: LessonMeta = {
  id: 'threads:interrupt',
  moduleId: 'threads',
  moduleIndex: '02',
  moduleTitle: '线程协作',
  title: '中断不是强制停止',
  subtitle: 'Thread.interrupt 是贴条子，不是拔电源。谁能挡掉它、谁会吞掉它，是必须背熟的语义。',
  kind: '实验',
  minutes: 22,
  level: '进阶',
  outcomes: ['正确恢复中断标记', 'sleep/wait/join/park 被打断时的各自语义', '写可取消的后台任务'],
};

const Body: LessonComponent = () => (
  <div className="space-y-4">
    <Section number="01" title="interrupt 到底做了什么">
      <P>
        调用 <Code>t.interrupt()</Code> 只做两件事：把 <Code>t</Code> 的中断标记设为 true；
        如果它此时正在 sleep/wait/join/park 里，立刻把它叫醒并抛 <Code>InterruptedException</Code>。
        除此之外别无特殊。
      </P>
      <P>
        结果：被中断者想退就退、想暂停就暂停、想忽略就忽略——它的 run() 仍然由自己决定你的生命。
        所以「协作」不是说法，是设计。
      </P>
      <TermCard
        items={[
          ['中断标记', 'Thread 里的 boolean；isInterrupted() 读它，interrupted() 读它并清掉。'],
          ['InterruptedException', '线程在阻塞方法中被叫醒时抛的"礼貌的请离开"信号。标志位同时被清掉。'],
          ['错误方案', 'Thread.stop() 会在任意位置把锁扔在地上，可能破坏对象不变量——已废弃。'],
        ]}
      />
    </Section>

    <Section number="02" title="最常见的错误：吞中断">
      <P>
        很多人这样写 while 循环调 sleep，catch 里什么都不做——上层调 interrupt 永远退不出来。
        这就是生产事故的"程序不退出"谜团。
      </P>
      <Callout variant="warning">
        写后台任务时必须答出两个问题的完整答案：
        （1）阻塞期间收到中断，sleep/wait 抛异常并<em>清标记</em>，你准备怎么再次中断自己往外跑？
        （2）被中断后 run() 怎么下到 TERMINATED？
      </Callout>
    </Section>

    <Section number="03" title="实验：中断、恢复、退出">
      <CodeLab
        title="协作式取消"
        moduleId="threads-interrupt"
        starterCode={`public class Main {
    public static void main(String[] args) throws Exception {
        Thread worker = new Thread(() -> {
            while (!Thread.currentThread().isInterrupted()) {
                System.out.println("working...");
                try {
                    Thread.sleep(400);
                } catch (InterruptedException e) {
                    // 错的示范：catch 空
                    System.out.println("interrupted but keep going");
                }
            }
            System.out.println("cleanly exited");
        });

        worker.start();
        Thread.sleep(1_300);
        worker.interrupt();
        worker.join(2_000);
        System.out.println("worker alive? " + worker.isAlive());
    }
}`}
        expectedOutput="worker alive? true（因为标记被吞）"
        note="先把上面这段跑一遍，看到 catch 吞标记后循环死不掉。然后改成正确写法：catch 里重新 interrupt 当前线程并 break——在跑一遍，确认 worker alive? false。这就是 M01·interrupt 这道题想让你亲手验证的事。"
      />
      <P>
        <strong className="text-foreground">放飞自我完成后，去 <a className="text-primary underline" data-open-lab>并发实验室</a> 完整做两道判题：</strong>
        <Code>start/join</Code> 和 <Code>write-no-lose-interrupt</Code>。
      </P>
    </Section>

    <Section number="04" title="你答得上来吗">
      <Predict
        question="子线程的 catch (InterruptedException) 里只做打印，不 break 不 return——上游能怎样让它退出？"
        options={[
          {
            label: '下次 sleep 还会被抛出，但标记已清；不修就一直打不透',
            correct: true,
            explain: '只做打印不改流程，循环会继续。更隐蔽的是：上层 join 也永远退不出来。所以"吞中断"导致的悬挂是线上最常见的并发事故之一。',
          },
          { label: 'JVM 会自动回收它', correct: false },
          { label: 'interrupt 一次不够就调三次', correct: false },
        ]}
      />
    </Section>
  </div>
);

const entry = { meta, Body };
export default entry;
