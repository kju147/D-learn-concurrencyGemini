// M00-1 · 为什么后端工程师必须懂并发（故事线模板的首课）
'use client';

import {
  Callout,
  Code,
  CodeLab,
  P,
  Predict,
  TermCard,
} from '@/components/lesson/blocks';
import { TicketShop } from '@/components/lesson/animations';
import type { LessonComponent, LessonMeta } from '@/components/lesson/lesson-page';

export const meta: LessonMeta = {
  id: 'intuition:why',
  moduleId: 'intuition',
  moduleIndex: '01',
  moduleTitle: '建立并发直觉',
  title: '为什么后端工程师必须懂并发',
  subtitle: '你写的每一行代码都在被调度。先看到问题长什么样，再决定要不要学并发。',
  kind: '概念',
  minutes: 12,
  level: '基础',
  outcomes: ['识别业务中的并发边界', '用吞吐/延迟解释"为什么并发"', '知道什么叫"并发"什么叫"并行"'],
};

/* 1. 钩子 */
const Hook = () => (
  <div className="space-y-4">
    <div className="rounded-xl border border-red-300/40 bg-red-50/70 p-5 dark:border-red-400/20 dark:bg-red-950/25">
      <p className="text-xs font-semibold text-red-800 dark:text-red-200">
        🚨 某大促当晚，一个订单服务收到了「关停指令」——但受理列表里还在哗哗进单。
      </p>
      <p className="mt-2 text-xs leading-6 text-red-700 dark:text-red-300">
        排查到最后，原因土得掉渣：那段代码不过是「读库存 → 判断 → 扣减」，
        两个线程在跑的时候，别人插进来一头。
      </p>
    </div>
    <P>
      这节课先不教工具。你只要先认识一件事：
      <strong className="text-foreground">只要你写的代码可能被多个线程同时走到，
      就要对「并发问题」有轮廓感</strong>——不一定现在就门儿清，
      但看到「读—判—改」这读/判/写三个字的组合，你要警觉。
    </P>
    <TermCard
      items={[
        ['共享状态', '多个线程都能摸到的那份"共同东西"。它最容易被并发改写出问题。'],
        ['线程安全', '多个线程并发访问下，对象行为总量保证不变量(库存不为负、登录不失效)。'],
        ['竞态条件', '程序结果依赖线程间的操作顺序，而这个顺序不确定。'],
      ]}
    />
  </div>
);

/* 2. 预测 */
const Quiz = () => (
  <Predict
    question="一段看起来平平无奇的「读数 → 判断 → 结果」代码，被两个线程同时执行会出问题吗？"
    options={[
      {
        label: '不知道，但肯定不简单',
        correct: true,
        explain: '能想到这一点就有了起点。',
      },
      {
        label: '会出问题——别人可以在读 与 写 之间插入进来',
        correct: true,
        explain: '猜得准。这就是多线程里最常见的坑，下一帧让你看到这幅真实样子。',
      },
      { label: '不会出问题，JVM 会帮我处理', correct: false },
    ]}
  />
);

/* 3. 眼见为实 */
const SeeIt = () => (
  <div className="space-y-4">
    <TicketShop />
    <P>
      刚才那个动画你看到的就是"丢失更新"本身：
      <strong className="text-foreground">两个线程各自加了一次，最后总数却少了一。</strong>
      这不是 JVM 的毛病，也不是内存不可靠——只是把「读、改、写」拆开之后，
      另一个线程在中间超过来回了。
    </P>
  </div>
);

/* 4. 动手 */
const Try = () => (
  <CodeLab
    title="两个线程交叉打印"
    moduleId="intuition-why"
    starterCode={`public class Main {
    public static void main(String[] args) throws Exception {
        Runnable r = () -> {
            for (int i = 0; i < 5; i++) {
                System.out.println(Thread.currentThread().getName() + " tick " + i);
                try { Thread.sleep(60); } catch (InterruptedException e) { return; }
            }
        };
        Thread a = new Thread(r, "A");
        Thread b = new Thread(r, "B");
        a.start(); b.start();
        a.join(); b.join();
        System.out.println("done");
    }
}`}
    expectedOutput="第二次点运行，顺序多半跟第一次不同"
    note="两个线程没有商量谁先来，由调度器随手爱给。一连按几次看顺序是否老变——这就是并发不确定性的铁证。"
  />
);

/* 5. 概念化 */
const Concept = () => (
  <div className="space-y-4">
    <P>
      <strong className="text-foreground">并发</strong>是"同时还在多件事上";<strong className="text-foreground">并行</strong>是多核上真的同步跑。
      这两个词常被混用，后面你多于壳学到的关系。
    </P>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg bg-muted p-4">
        <p className="text-xs font-semibold">吞吐</p>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          单位时间完成多少件事。并发的真实收益。
        </p>
      </div>
      <div className="rounded-lg bg-muted p-4">
        <p className="text-xs font-semibold">延迟</p>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          单个任务有多久。"吞吐更高"与"出餐更快"不是一码事——单子越大，排队越慢。
        </p>
      </div>
      <div className="rounded-lg bg-muted p-4">
        <p className="text-xs font-semibold">资源利用率</p>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          线程在等 I/O 时，CPU 在空转。这就是为什么我们需要维持上百个阻塞调用。
        </p>
      </div>
    </div>
    <Callout variant="idea">
      <strong>收:</strong>并发=对外在做多件事；并行=多核同步跑。
      WebFlux 的意义是减少等待的时间，不是让 CPU 变多。
    </Callout>
  </div>
);

/* 6. 迁移小题 */
const Transfer = () => (
  <Predict
    question="一个「显示库存 → 检查够不够 → 扣掉」的方法，被两个线程同时调用，会发生什么？"
    options={[
      {
        label: '库存可能被扣穿——因为判断和扣减之间有别人插进来',
        correct: true,
        explain: '对。以后只要再看到「读 → 判 → 改」三连结构，竞态直觉就该亮起来。',
      },
      { label: '不会出问题，反正字段上写了 if 判断', correct: false },
    ]}
  />
);

export const steps = [
  { id: 'hook', title: '钩子·事故', goal: '并发问题在生产中的样子', body: <Hook /> },
  { id: 'predict', title: '预测·心头有数', goal: '先于 JMM 先感受到危险', body: <Quiz /> },
  { id: 'see-it', title: '演示·眼见为实', goal: '动画里看到丢失更新', body: <SeeIt /> },
  { id: 'try', title: '动手·在 JVM 里跑', goal: '交叉打印的不确定性', body: <Try /> },
  { id: 'concept', title: '概念·口径收拢', goal: '吞吐/延迟/利用率的正确口径', body: <Concept /> },
  { id: 'transfer', title: '迁移·带着直觉出活', goal: '竞态直觉的第一个种子', body: <Transfer /> },
];

const entry = {
  meta,
  steps,
};

export default entry;
