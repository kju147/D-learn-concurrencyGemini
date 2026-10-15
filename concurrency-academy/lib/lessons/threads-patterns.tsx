// M01-5 · 保护性暂停与两阶段终止（M01 收官课：模式综合）
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
  id: 'threads:patterns',
  moduleId: 'threads',
  moduleIndex: '02',
  moduleTitle: '线程协作',
  title: '保护性暂停与两阶段终止',
  subtitle: 'M01 收官：把之前学的范式串成真实后端模板——信箱、看门狗、优雅的关服务。',
  kind: '实战',
  minutes: 35,
  level: '高级',
  outcomes: ['会用模式名成对认出问题', '两个最工作里的模板：Guarded Suspension 与两阶段终止', '给自己的线程写"我会收"的义务'],
};

const Body: LessonComponent = () => (
  <div className="space-y-4">
    <Section number="01" title="几个模式的名字只是上线聊天工具">
      <P>
        Guarded Suspension（等条件）、Balking（条件不满足直接拒绝）、Producer-Consumer、
        Worker Thread、Two-Phase Termination、Read-Write 冲分割……
        名字是设计模式集市；本质只是几组时序的允许状态。面试官爱问名字，线上的 Bug 爱的是你是否跟在上面跑过。
      </P>
      <TermCard
        items={[
          ['Guarded Suspension', '条件没满足不许干——等 poll 换成 while，等出真保障。'],
          ['Balking', '脏/占线条件下一入口就拒绝——不等——交给调用方处理重试。'],
          ['Producer-Consumer', '一个生产一个消费，队列背着压。'],
          ['Two-Phase Termination', '第一阶段发现停喊，第二阶段清场；收得干不干决定你有没有资源泄漏。'],
          ['守护线程 vs 工作线程', '守护是给人收拾局面的；干活线程死了不收拾，业务会漏钱。'],
        ]}
      />
    </Section>

    <Section number="02" title="最常被写错的两个后缀">
      <P>
        1) wait 等条件——写成 if 就埋了虚假唤醒。<br />
        2) 后台线程退出——catch 了 InterruptedException 往下继续跑，收不回去。
      </P>
      <Callout variant="warning">
        两个错误，共用一个名字「不肯退」。教材里教的写法，你未来要给别人 review；自己写时记一句口诀：
        <strong className="text-foreground">等要 while，退要彻底。</strong>
      </Callout>
    </Section>

    <Section number="03" title="实验：一个消息信箱">
      <CodeLab
        title="Guarded Suspension：等一条消息"
        moduleId="threads-patterns"
        starterCode={`public class Main {
    static final Object lock = new Object();
    static String msg;

    public static void main(String[] args) throws Exception {
        Thread consumer = new Thread(() -> {
            synchronized (lock) {
                while (msg == null) {
                    try { lock.wait(); } catch (InterruptedException e) { return; }
                }
                System.out.println("收到: " + msg);
            }
        }, "consumer");

        Thread producer = new Thread(() -> {
            synchronized (lock) {
                msg = "hello from producer";
                lock.notifyAll();
            }
        }, "producer");

        consumer.start();
        Thread.sleep(300);        // 往后一点点，让 consumer 先待在 wait
        producer.start();
        producer.join();
        consumer.join();
        System.out.println("done");
    }
}`}
        expectedOutput="收到: hello from producer\ndone"
        note="注意两端的 synchronized 块边界，以及 wait 一定在那个 while 里。"
      />
    </Section>

    <Section number="04" title="测验">
      <Predict
        question="下面哪种信号丢失了也無所请？"
        options={[
          {
            label: 'notifyAll 之前，还没有任何线程进 wait——这个信号就丢进了空气里',
            correct: true,
            explain: '对。所以要么先注册了等待条件，要么在共享数据结构里记下来者住过，不能只靠 notify。',
          },
          { label: '中断也不会被丢掉', correct: false },
          { label: '只要对象在，wait 能任意重来', correct: false },
        ]}
      />
      <Callout variant="idea">
        兴趣题：结合 M05 你会知道为什么 Lock 的 Condition 要好用得多——
        本质只是「同一件错误示范地被写少了」。
      </Callout>
    </Section>
  </div>
);

const entry = { meta, Body };
export default entry;
