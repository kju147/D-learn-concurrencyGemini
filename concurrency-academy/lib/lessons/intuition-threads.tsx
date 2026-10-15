// M00-2 · 进程、线程与调度（故事线模板）
'use client';

import {
  Callout,
  Code,
  CodeLab,
  P,
  Predict,
  TermCard,
} from '@/components/lesson/blocks';
import { TeaOrchestration } from '@/components/lesson/animations';
import type { LessonMeta } from '@/components/lesson/lesson-page';

export const meta: LessonMeta = {
  id: 'intuition:process-thread',
  moduleId: 'intuition',
  moduleIndex: '01',
  moduleTitle: '建立并发直觉',
  title: '进程、线程与调度',
  subtitle: '进程是资源容器，线程是干活的人。调度器是分时间片的裁判——在什么时间哪条线程能跑，它说了算。',
  kind: '概念',
  minutes: 18,
  level: '基础',
  outcomes: ['进程与线程的分工', '同步/异步/阻塞/非阻塞的辨析边界', '能先找到「谁在等」再谈调优'],
  exerciseId: 'm00-make-tea',
};

/* 1. 钩子 */
const Hook = () => (
  <div className="space-y-4">
    <div className="rounded-xl border border-amber-300/40 bg-amber-50/70 p-5 dark:border-amber-400/20 dark:bg-amber-950/25">
      <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
        🍵 烧水泡茶：烧水 3 分钟，洗茶具 2 分钟，泡茶必须代替要等两个都好了才能开。
      </p>
      <p className="mt-2 text-xs leading-6 text-amber-800 dark:text-amber-200">
        华罗庚《统筹法》里说过：先洗水壶、灌水去灶上烧，等水开的三分钟里洗茶具——
        串行做要 8 分钟，统筹并行只要 6 分钟。我们这课的第一场实验就是它。
      </p>
    </div>
    <P>
      这就是这门课的第一个经典场景：<strong className="text-foreground">烧水泡茶</strong>。
      里面压着进程、线程、调度、同步那全部入门要素。
    </P>
  </div>
);

/* 2. 基础概念 */
const Basics = () => (
  <div className="space-y-4">
    <P>
      <strong className="text-foreground">进程</strong>（Process）：一个正在运行的程序实例，
      它是资源分配的单位（内存空间、打开的文件、网络连接都是它的财产）。
      同一份代码可以启动多个进程，它们彼此是独立的身份，各自说各自的。
    </P>
    <P>
      <strong className="text-foreground">线程</strong>（Thread）：进程里面的执行流，
      有自己的程序计数器（执行到哪一行）和栈（当前调用链）。
      线程们共享进程的内存——这是它们能快捷交换消息的方式，也是一切麻烦的本源。
    </P>
    <TermCard
      items={[
        ['程序计数器', '每个线程单独持有的"我执行到哪一行"的指针；切换时由调度器保存。'],
        ['上下文切换', '操作系统换班动作：保存现场→换人→恢复现场。一次几微秒，切多了就是准费。'],
        ['时间片', '一个线程至多占一次 CPU 的限时。时间片一到，调度器绝不犹豫，换人。'],
      ]}
    />
  </div>
);

/* 3. 剧场 */
const Animate = () => (
  <div className="space-y-4">
    <TeaOrchestration />
    <P>
      <strong className="text-foreground">并发不等于并行：</strong>串行是"等完再开始下一件"；
      并行统筹是"别人等的工夫我正好开工"。
    </P>
  </div>
);

/* 4. 动手 */
const Try = () => (
  <CodeLab
    title="看到调度顺序"
    moduleId="intuition-threads"
    starterCode={`public class Main {
    public static void main(String[] args) throws Exception {
        Thread cook = new Thread(() -> {
            System.out.println("我在烧水: " + Thread.currentThread().getName());
            try { Thread.sleep(300); } catch (InterruptedException e) { return; }
            System.out.println("水开了");
        }, "烧水工");

        Thread wash = new Thread(() -> {
            System.out.println("我在洗茶具: " + Thread.currentThread().getName());
            try { Thread.sleep(200); } catch (InterruptedException e) { return; }
            System.out.println("茶具洗好了");
        }, "洗茶工");

        cook.start();
        wash.start();
        System.out.println("主线程不等待,跑完了");
    }
}`}
    expectedOutput={"主线程先打印 \"主线程不等待,跑完了\"，两个工作线程再各自出结果"}
    note="start() 的意思是「把任务交给新线程去跑，然后你就不等了」——这只是发射信号，不是蹲守。你要等，就得用 join。"
  />
);

/* 5. 收拢 */
const Concept = () => (
  <div className="space-y-4">
    <P>
      <strong className="text-foreground">同步 vs 异步</strong>看「调用方要不要等结果」；
      <strong className="text-foreground">阻塞 vs 非阻塞</strong>看「调用的时候线程在不在等」。
      这两个问题并不是一个概念，但它们总是在 JVM 一起摆硬闯。
    </P>
    <P>
      Tomcat/Netty 一次要为成百上千用户开线程（或事件），它们之所以"能并行很多件事"，
      不是因为核很多，而是因为<em>它们大部分时间都在等别人的响应。</em>
      想通了这一点，"如何配线程池"这个问题才算可以开始开口讨论。
    </P>
  </div>
);

/* 6. 迁移 */
const Transfer = () => (
  <Predict
    question="烧水泡茶练习里，如果主线程忘了 join(),会发生什么？"
    options={[
      {
        label: '茶没烧就会上来——main 会提前打出来"泡茶"，但两个工作线程还紧张忙',
        correct: true,
        explain: '正确。join 是控制流汇合的必要手段。去判题练习把这段跑对啊。',
      },
      { label: '程序会直接行错', correct: false },
    ]}
  />
);

export const steps = [
  { id: 'hook', title: '钩子·烧水泡茶的统筹', goal: '并发教材里最经典的场景', body: <Hook /> },
  { id: 'basics', title: '概念·进程与线程', goal: '程序计数器/上下文切换/时间片', body: <Basics /> },
  { id: 'animate', title: '剧场·任务在核上', goal: 'Rob Pike 与自己调度笔记', body: <Animate /> },
  { id: 'try', title: '动手·浏览器 JVM 跑一次', goal: '看到两个线程谁也不让谁，顺序由调度枢击定制', body: <Try /> },
  { id: 'concept', title: '概念·收拢同步异步', goal: '讲清别人听不到的纸带', body: <Concept /> },
  { id: 'transfer', title: '迁移·join 不仅完成排序', goal: '相互让工期名物', body: <Transfer /> },
];

const entry = { meta, steps };
export default entry;
