// M04-1 （标杆课） · 为什么另一个线程「看不见」新值？
// Upgrade from the earlier hand-written JMM lesson into the data-driven engine.
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
import { MemoryLanes } from '@/components/lesson/animations';
import type { LessonComponent, LessonMeta } from '@/components/lesson/lesson-page';

export const meta: LessonMeta = {
  id: 'jmm:visibility',
  moduleId: 'jmm',
  moduleIndex: '03',
  moduleTitle: 'Java 内存模型',
  title: '为什么线程看不见新值',
  subtitle: '不是 JVM 出了问题，而是「这个写为什么对它可见」本来就需要你给出一条明确 happens-before 证。',
  kind: '实验',
  minutes: 18,
  level: '进阶',
  outcomes: ['能用 happens-before 说清 JMM 而不是背规则', '能看出程序里的『数据竞争』', '会用 volatile / 锁 / final 取对应武器'],
};

const Body: LessonComponent = () => (
  <div className="space-y-4">
    <Section number="01" title="事故：关掉开关后，不肯停的服务">
      <P>
        后台跑一个循环拉任务的服务，有个关停线程把它停掉——写 <Code>running = false</Code>。
        线上发现服务根本不停（还在拉起活）。
      </P>
      <P>
        从业务看是「关闭不生效」；从 JMM 看，是「主线程的写对工作线程是否可见」没有被任何机制保证。
        <strong className="text-foreground">在并发里说先写后读，本来就要证明——catch-it 这类事故不写老虎。</strong>
      </P>
      <TermCard
        items={[
          ['数据竞争', '同一变量被多线程访问且没有同步动作，行为没有定义——不存在安全读。'],
          ['happens-before', 'JMM 提供「先序」规则（持锁、volatile、final、线程 join 等等），改写顺序后再说可见性。'],
          ['作者的责任', '由程序指定（volatile/锁/HB），JVM 不替你脑补。'],
        ]}
      />
    </Section>

    <Section number="02" title="先预测，再看答案">
      <Predict
        question="下面这段代码，不加同步、没有 volatile，consumer 能否保证读到 flag = true？"
        options={[
          {
            label: '可以，赋值总会哪里哪里看到',
            correct: false,
          },
          {
            label: '不能保证——这就是数据竞争，需要显式同步动作',
            correct: true,
            explain: '正确。JLS §17 没给这种「漫无目的的写+seen」关系。要么 volatile/synchronized 持锁对，要么 join 的起止对。',
          },
        ]}
      />
    </Section>

    <Section number="03" title="时间线：同一个变量上的两条线程">
      <MemoryLanes />
      <Callout variant="idea">
        读了旧值不是线程「慢了」，是<em>没建立可见性</em>——你是在向 JVM 要「先序」证据：happens-before 依据。
      </Callout>
    </Section>

    <Section number="04" title="实验：把竞态抓出来，再修复">
      <CodeLab
        title="最小可见性反例"
        moduleId="jmm-visibility"
        starterCode={`public class Main {
    private static /* volatile */ boolean running = true;   // 先用评论符瓶子里毒一下

    public static void main(String[] args) throws Exception {
        Thread worker = new Thread(() -> {
            long end = System.currentTimeMillis() + 300;
            long i = 0;
            while (running && System.currentTimeMillis() < end) i++;
            System.out.println("worker stopped? " + running);
        }, "worker");

        worker.start();
        Thread.sleep(50);
        running = false;          // main 写
        worker.join(2_000);
        System.out.println("worker alive? " + worker.isAlive());
    }
}`}
        expectedOutput="不加 volatile 时 worker alive? 可能还是 true；加回来后 false"
        note="第一遍，注释保留默认（无 volatile）跑看看；第二遍把注释去掉变真 volatile。浏览器 JVM 中两种行为的对比就是 happens-before 做没做到的差别。"
      />
      <P>
        <strong className="text-foreground">这是『并发实验室』JMM 判题里让你亲手复现的一件事：</strong>
        只加 volatile，就能把工作线程从死等里救回来。
      </P>
    </Section>

    <Section number="05" title="业务迁移评估一题">
      <Predict
        question="服务里有个开关会被请求线程和定时任务同时读写，选哪种同步方式最专业？"
        options={[
          { label: '用 volatile（纯开关）/ AtomicBoolean（需要复合操作）', correct: true,
            explain: '单个开关的读写并发——volatile 足够；要读-改-写作为一个原子动作（比如改状态机），就升级到原子类或锁。' },
          { label: '每个方法加 synchronized（最保险）', correct: false },
        ]}
      />
      <Callout variant="warning">
        更复杂的场景请用 JCStress 验证，而不是单靠「跑了一圈没错」。
        后面的 JMM 模块会教你怎么写那样的测试。
      </Callout>
    </Section>
  </div>
);

const entry = { meta, Body };
export default entry;
