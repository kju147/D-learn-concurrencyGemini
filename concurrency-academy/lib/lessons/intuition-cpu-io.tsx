// M00-4 · CPU 密集与 I/O 密集这一步定生死
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
  id: 'intuition:cpu-io',
  moduleId: 'intuition',
  moduleIndex: '01',
  moduleTitle: '建立并发直觉',
  title: 'CPU 密集与 I/O 密集',
  subtitle: '先问你的任务“在忙什么”，才能决定“要不要并发多种几个核”。',
  kind: '诊断',
  minutes: 20,
  level: '进阶',
  outcomes: ['一个任务到哪会被什么资源卡住（CPU？网络？磁盘？）', '为工作负载选择执行模型', "学会 Little's Law 的第一小时图"],
};

const Body: LessonComponent = () => (
  <div className="space-y-4">
    <Section number="01" title="两种最不装象的负载">
      <P>
        <strong className="text-foreground">CPU 密集</strong>：乘一万个矩阵、压缩日志、加密签名——
        它不停在核上跑，任务的速度跟核数直接成正比，直到核占满为止。<br />
        <strong className="text-foreground">I/O 密集</strong>：查数据库、调远程接口、读文件——
        线程大部分时间都在「等」，多线程这时候是为了让等的时间换一个核跑去马上干活。
      </P>
      <P>
        错误一类的口诀是：CPU 任务想用多线程加速——要不能加吗？
        能，超不过核数。I/O 任务碰数据库连接池用光——你能不能加速？能也一样，超不过下游上限。
      </P>
      <Callout variant="warning">
        遇到「上多线程依然慢」先别怀疑核数——先查下游。MySQL/Redis/远程 API 是<em>你慢的地方</em>还是「等的地方」。
      </Callout>
    </Section>

    <Section number="02" title="直觉来源：Little's Law">
      <P>
        记一条最朴素的排队论公式（任何服务器都服从它）：
      </P>
      <pre className="code-block mt-3 rounded-lg p-4 text-sm font-mono text-emerald-200">
        并发数 ≈ 吞吐量 × 平均延迟{'\n'}
        (in-flight ≈ ops/sec × sec/op)
      </pre>
      <P>
        比如：一个下单接口 P99=200ms、压测要到 1000 QPS——你并发着要 200 个请求在途。
        先记住这个数字，后面线程池大小、背压、虚拟线程扩容才算得出该不该做。
      </P>
    </Section>

    <Section number="03" title="实验：同 CPU 烧与 I/O 烧的实际体验">
      <CodeLab
        title="看一看 wait 和忙的差别"
        moduleId="intuition-cpu-io"
        starterCode={`public class Main {
    public static void main(String[] args) throws Exception {
        Runnable busy = () -> {
            long end = System.currentTimeMillis() + 300;
            long x = 0;
            while (System.currentTimeMillis() < end) x++;
            System.out.println("busy done " + Thread.currentThread().getName());
        };
        Runnable idle = () -> {
            try {
                Thread.sleep(300);
            } catch (InterruptedException e) { return; }
            System.out.println("idle done " + Thread.currentThread().getName());
        };
        Thread a = new Thread(busy, "busy-1");
        Thread b = new Thread(idle, "idle-1");
        a.start(); b.start();
        a.join(); b.join();
        System.out.println("main done");
    }
}`}
        expectedOutput="idle 与 busy 几乎同时间完成"
        note="busy 线程在烧 CPU；idle 线程在调 sleep 让出——两者都花了 ~300ms 完成。对服务器来说，后者才真正说明并发有赚头。"
      />
    </Section>

    <Section number="04" title="业务迁移自测">
      <Predict
        question="订单接口后台要调 4 个外部服务，各自 200ms 延迟。把 4 个调用并行化后，延迟是多少？"
        options={[
          {
            label: '≈ 200ms（受最长的那个决定），总吞吐随并发上限',
            correct: true,
            explain: '并行化把"4×200ms 串行"变成"看最慢的那个"。但这只能在不过载下游的前提下成立——并发的上限仍然是核数与连接池。',
          },
          { label: '≈ 50ms，因为 4 个任务平分', correct: false },
          { label: '≈ 800ms，因为每个线程自己也要 200ms', correct: false },
        ]}
      />
    </Section>
  </div>
);

const entry = { meta, Body };
export default entry;
