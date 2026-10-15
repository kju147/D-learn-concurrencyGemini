// M01-4 · park/unpark 与两阶段终止
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
  id: 'threads:park',
  moduleId: 'threads',
  moduleIndex: '02',
  moduleTitle: '线程协作',
  title: 'park/unpark 与许可模型',
  subtitle: 'LockSupport 我愿称之为「不会出错的 wait」——一次只允许一张停车条。这正是 Lock 与 AQS 的底层基础。',
  kind: '概念',
  minutes: 18,
  level: '进阶',
  outcomes: ['park/unpark 永远不会成对出错的原因', '比 wait 简单在哪里', '两阶段终止的模板'],
};

const Body: LessonComponent = () => (
  <div className="space-y-4">
    <Section number="01" title="LockSupport 是保持纪念册">
      <P>
        <Code>wait()</Code> 担心被先叫醒来，会先退锁再睡，然后被自己坑；
        <Code>park()</Code> 做了件更实在的事——给线程一张「停车条」（许可），
        之后的 <Code>unpark()</Code> 只负责轻上所属。unpark 的许可会被「被车场留着」，
        所以即使先 unpark 再 park，后者不会睡死。
      </P>
      <Callout variant="idea">
        记住这句话，锁一百种世界都会顺：
        <strong className="text-foreground">park 不被「被扰」，不被抢。</strong>
      </Callout>
    </Section>

    <Section number="02" title="实验：先停车，再唤醒">
      <CodeLab
        title="park/unpark"
        moduleId="threads-park"
        starterCode={`import java.util.concurrent.locks.LockSupport;

public class Main {
    public static void main(String[] args) throws Exception {
        Thread t = new Thread(() -> {
            System.out.println("about to park");
            LockSupport.park();
            System.out.println("got permit, awake");
        }, "parked");

        t.start();
        Thread.sleep(300);
        LockSupport.unpark(t);
        t.join();
        System.out.println("done");
    }
}`}
        expectedOutput="about to park\ngot permit, awake\ndone"
        note="park 不携带锁，的配合最少；这就是它在写并发库时比 wait/notify 更实用的原因。"
      />
    </Section>

    <Section number="03" title="两阶段终止的套路">
      <P>
        生产代码里服务线程长这样：
        外层循环青守「条件不满足就继续睡 / 等」，内层响应中断才退出。
        这也是 <Code>Two Phase Termination</Code> 之后的迁移题来源。
      </P>
      <CodeLab
        title="后台监控型任务的正确骨架"
        moduleId="threads-park-two-phase"
        starterCode={`public class Main {
    public static void main(String[] args) throws Exception {
        Thread monitor = new Thread(() -> {
            while (!Thread.currentThread().isInterrupted()) {
                System.out.println("heartbeat");
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    System.out.println("cleaning up and goodbye");
                }
            }
        }, "monitor");

        monitor.start();
        Thread.sleep(1_300);
        monitor.interrupt();
        monitor.join(2_000);
        System.out.println("main finished");
    }
}`}
        expectedOutput="heartbeat ×2 ~ ×3，最后 cleanly exited"
        note="这是 M01·write-interrupt 练习直接对应的原型——先自己在浏览器 JVM 里把「收到中断当场退出」跑通一次。"
      />
    </Section>

    <Section number="04" title="小测验">
      <Predict
        question="如果我们漏掉了 for/while 的中断检查（没写！isInterrupted()），只在 sleep catch 里 break，会怎样？"
        options={[
          {
            label: '如果没有人调 interrupt 就没有退出条件，线程永远运行',
            correct: true,
            explain: '如果没有中断信号，行为本身没错；但只要你的生命周期永远归「别人的调度」，上游永远收不住。所以任务应当显式有自己的停的样子：isInterrupted() + catch 恢复。',
          },
          { label: '没关系', correct: false },
        ]}
      />
    </Section>
  </div>
);

const entry = { meta, Body };
export default entry;
