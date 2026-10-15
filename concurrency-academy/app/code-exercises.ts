import {
  starter as startJoinStarter,
  solution as startJoinSolution,
} from '@/lib/start-join-exercise.mjs';

export type CodeCheck = {
  id: string;
  label: string;
  pattern: string;
  flags?: string;
  failure: string;
};

export type CodeExercise = {
  id: string;
  module: string;
  title: string;
  scenario: string;
  objective: string;
  difficulty: '基础' | '进阶';
  revision?: number;
  filename: string;
  starter: string;
  checks: CodeCheck[];
  hints: string[];
  solution: string;
};

export const codeExercises: CodeExercise[] = [
  {
    id: 'm00-make-tea',
    filename: 'BrewTea.java',
    module: 'M00 · 入学预备与并发直觉',
    title: '烧水泡茶统筹法',
    revision: 2,
    scenario:
      '两个人协作烧水泡茶：烧水要 3 秒、洗茶具要 2 秒，泡壶要等它们都完成。用两个线程并行做这件事，再正确地汇合到泡茶。',
    objective:
      '用两个各带名字的平台线程并行跑烧水与洗茶具，用 join 汇合到主线程的泡茶步骤。',
    difficulty: '基础',
    starter: `public class BrewTea {
    public static final java.util.List<String> events = new java.util.concurrent.CopyOnWriteArrayList<>();

    public static void main(String[] args) throws InterruptedException {
        Runnable boilWater = () -> {
            sleepSeconds(3);
            events.add(Thread.currentThread().getName() + ":水开了");
        };
        Runnable washSet = () -> {
            sleepSeconds(2);
            events.add(Thread.currentThread().getName() + ":茶具洗好了");
        };

        // TODO 1: 并行做两件事（洗茶的叫 "洗茶的"，烧水的叫 "烧水的"）

        // TODO 2: 主线程等两个都做完再泡茶

        events.add("main:泡茶");
    }

    private static void sleepSeconds(int seconds) {
        try { Thread.sleep(seconds * 1000L); } catch (InterruptedException e) { return; }
    }
}`,
    checks: [],
    hints: [
      'Thread.ofPlatform().name("烧水的").start(任务) 会立刻返回一个 Thread 对象，请务必接住。',
      '到泡茶的步凑前有两次应当是 join()，不然 main 会抢先预势。',
    ],
    solution: `public class BrewTea {
    public static final java.util.List<String> events = new java.util.concurrent.CopyOnWriteArrayList<>();

    public static void main(String[] args) throws InterruptedException {
        Runnable boilWater = () -> {
            sleepSeconds(3);
            events.add(Thread.currentThread().getName() + ":水开了");
        };
        Runnable washSet = () -> {
            sleepSeconds(2);
            events.add(Thread.currentThread().getName() + ":茶具洗好了");
        };
        Thread t1 = Thread.ofPlatform().name("烧水的").start(boilWater);
        Thread t2 = Thread.ofPlatform().name("洗茶的").start(washSet);
        t1.join();
        t2.join();
        events.add("main:泡茶");
    }

    private static void sleepSeconds(int seconds) {
        try { Thread.sleep(seconds * 1000L); } catch (InterruptedException e) { return; }
    }
}`,
  },
  {
    id: 'm01-start-join',
    revision: 2,
    filename: 'OrderImport.java',
    module: 'M01 · 线程与任务',
    title: '启动线程，并等待结果可用',
    scenario:
      '订单导入程序需要在后台计算有效订单数，但主线程必须等计算完成后才能生成报表。只补全 validateAndAwait 方法，保留方法签名和 main 示例；传入的校验任务可能不同。',
    objective:
      '将传入的任务交给名为 order-validator 的平台线程执行一次，用 join 等到线程结束；等待被中断时，让 InterruptedException 交给调用方处理。',
    difficulty: '基础',
    starter: startJoinStarter,
    checks: [
      {
        id: 'platform-builder',
        label: '使用 Thread.ofPlatform() 创建平台线程',
        pattern: 'Thread\\s*\\.\\s*ofPlatform\\s*\\(',
        failure: '当前还没有使用平台线程 Builder。',
      },
      {
        id: 'name',
        label: '线程命名为 order-validator',
        pattern: '\\.name\\s*\\(\\s*"order-validator"\\s*\\)',
        failure: '线程名能让日志和线程转储可读，请补上明确名称。',
      },
      {
        id: 'start',
        label: '调用 start(validate)，而不是 validate.run()',
        pattern: '\\.start\\s*\\(\\s*validate\\s*\\)',
        failure: '需要真正启动新线程；直接调用 run 不会创建并发执行。',
      },
      {
        id: 'reference',
        label: '保存返回的 Thread 引用',
        pattern: 'Thread\\s+\\w+\\s*=\\s*Thread\\s*\\.\\s*ofPlatform',
        failure: '后续 join 需要线程引用，请保存 Builder.start 的返回值。',
      },
      {
        id: 'join',
        label: '在打印结果前调用 join()',
        pattern: '\\.join\\s*\\(\\s*\\)\\s*;[\\s\\S]*System\\.out\\.println',
        failure: '主线程打印结果前必须等待工作线程完成。',
      },
      {
        id: 'no-todo',
        label: '删除全部 TODO 占位',
        pattern: '^(?![\\s\\S]*TODO)[\\s\\S]*$',
        failure: '还有 TODO 未处理。',
      },
    ],
    hints: [
      'Thread.ofPlatform().name(...).start(validate) 会返回已经启动的 Thread。',
      '把返回值保存为 worker，然后在打印前调用 worker.join()。',
    ],
    solution: startJoinSolution,
  },
  {
    id: 'm01-interrupt',
    filename: 'InventorySync.java',
    module: 'M01 · 线程与任务',
    title: '写一个不会丢中断的后台任务',
    scenario:
      '库存同步线程每隔一秒拉取一次变更。应用关闭时会调用 interrupt；你需要让任务及时退出，并保留中断语义。',
    objective: '掌握协作式取消、阻塞中断和中断标记恢复。',
    difficulty: '进阶',
    revision: 2,
    starter: `public final class InventorySync implements Runnable {
    @Override
    public void run() {
        // TODO：只要没有收到中断就持续同步
        while (true) {
            try {
                syncOnce();
                Thread.sleep(1_000);
            } catch (InterruptedException e) {
                // TODO：不要吞掉中断
            }
        }
    }

    private void syncOnce() {
        // pull inventory changes
    }
}`,
    checks: [
      {
        id: 'condition',
        label: '循环条件检查 isInterrupted()',
        pattern:
          'while\\s*\\(\\s*!\\s*Thread\\.currentThread\\(\\)\\.isInterrupted\\(\\)\\s*\\)',
        failure: '循环仍然无法响应运行期间收到的中断。',
      },
      {
        id: 'catch',
        label: '显式捕获 InterruptedException',
        pattern: 'catch\\s*\\(\\s*InterruptedException\\s+\\w+\\s*\\)',
        failure: 'sleep 的中断路径需要被显式处理。',
      },
      {
        id: 'restore',
        label: '捕获后恢复当前线程的中断标记',
        pattern: 'Thread\\.currentThread\\(\\)\\.interrupt\\(\\)\\s*;',
        failure: 'InterruptedException 会清除标记；无法向上抛出时应恢复它。',
      },
      {
        id: 'exit',
        label: '恢复标记后退出当前循环或方法',
        pattern:
          'Thread\\.currentThread\\(\\)\\.interrupt\\(\\)\\s*;\\s*(?:break|return)\\s*;',
        failure: '恢复标记后还应立即 break 或 return，避免继续执行任务。',
      },
      {
        id: 'no-stop',
        label: '没有使用 Thread.stop()',
        pattern: '^(?![\\s\\S]*Thread\\s*\\.\\s*stop\\s*\\()[\\s\\S]*$',
        failure: 'Thread.stop 会破坏不变量，不能作为取消方案。',
      },
      {
        id: 'no-todo',
        label: '删除全部 TODO 占位',
        pattern: '^(?![\\s\\S]*TODO)[\\s\\S]*$',
        failure: '还有 TODO 未处理。',
      },
    ],
    hints: [
      '循环条件可写成 !Thread.currentThread().isInterrupted()。',
      'sleep 抛出 InterruptedException 时标记会被清除：先重新 interrupt，再 break。',
    ],
    solution: `public final class InventorySync implements Runnable {
    @Override
    public void run() {
        while (!Thread.currentThread().isInterrupted()) {
            try {
                syncOnce();
                Thread.sleep(1_000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    private void syncOnce() {
        // pull inventory changes
    }
}`,
  },
  {
    id: 'm01-future-task',
    filename: 'Settlement.java',
    module: 'M01 · 线程与任务',
    title: '用 FutureTask 返回计算结果',
    scenario:
      '结算程序需要在工作线程中计算金额，并由主线程获取结果。不能通过共享可变字段传值。',
    objective: '把 Callable、FutureTask、Thread 和 get 串成完整任务模型。',
    difficulty: '进阶',
    revision: 2,
    starter: `import java.util.concurrent.FutureTask;

public class Settlement {
    public static void main(String[] args) throws Exception {
        // TODO 1：创建一个返回 12800 的 FutureTask<Integer>

        // TODO 2：用名为 settlement-calc 的线程启动任务

        // TODO 3：等待并取得计算结果
        int amount = 0;
        System.out.println("amount=" + amount);
    }
}`,
    checks: [
      {
        id: 'future-task',
        label: '创建 FutureTask<Integer>',
        pattern:
          'FutureTask\\s*<\\s*Integer\\s*>\\s+\\w+\\s*=\\s*new\\s+FutureTask',
        failure: '需要创建带 Integer 结果类型的 FutureTask。',
      },
      {
        id: 'callable-result',
        label: '任务返回 12800',
        pattern: 'FutureTask[\\s\\S]*12_?800',
        failure: 'Callable 的计算结果应为 12800。',
      },
      {
        id: 'thread-name',
        label: '线程命名为 settlement-calc',
        pattern: 'new\\s+Thread\\s*\\([^;]*"settlement-calc"\\s*\\)',
        failure: '创建线程时请提供 settlement-calc 名称。',
      },
      {
        id: 'start',
        label: '启动承载 FutureTask 的线程',
        pattern: 'new\\s+Thread\\s*\\([\\s\\S]*?\\)\\s*\\.\\s*start\\s*\\(',
        failure: 'FutureTask 还没有交给 Thread 启动。',
      },
      {
        id: 'get',
        label: '通过 get() 获取 amount',
        pattern: 'int\\s+amount\\s*=\\s*\\w+\\.get\\s*\\(\\s*\\)',
        failure: '请用 FutureTask.get() 等待并获得结果。',
      },
      {
        id: 'no-todo',
        label: '删除全部 TODO 占位',
        pattern: '^(?![\\s\\S]*TODO)[\\s\\S]*$',
        failure: '还有 TODO 未处理。',
      },
    ],
    hints: [
      'FutureTask<Integer> task = new FutureTask<>(() -> 12_800);',
      'new Thread(task, "settlement-calc").start()，随后用 task.get() 取得结果。',
    ],
    solution: `import java.util.concurrent.FutureTask;

public class Settlement {
    public static void main(String[] args) throws Exception {
        FutureTask<Integer> task = new FutureTask<>(() -> 12_800);
        new Thread(task, "settlement-calc").start();

        int amount = task.get();
        System.out.println("amount=" + amount);
    }
}`,
  },
];
