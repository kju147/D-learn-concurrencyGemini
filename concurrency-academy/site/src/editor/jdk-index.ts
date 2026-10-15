// 课程 API 元数据索引（第一期）：覆盖并发课全部表面积
// 数据原则：宁可少而准。每项带一句人用注释，供补全/签名提示/hover 复用。
// 后续规模扩编要走"从 JDK src.zip 半自动生成 + 人工修注"的管线。

export type MemberSig = {
  name: string;                 // 含参数形签：start() / sleep(long)
  params: string;               // 展示用形参
  insert: string;               // 建议插入文本（可含 snippet ${1}）
  returns: string;
  isStatic?: boolean;
  throws?: string[];            // 受检异常
  doc: string;
};

export type CtorSig = { sig: string; insert?: string; doc: string };

export type ClassMeta = {
  fqn: string;
  kind: 'class' | 'interface';
  doc: string;
  constructors?: CtorSig[];
  members: MemberSig[];         // members 里静态与实例并列，靠 isStatic 区分
  fields?: { name: string; type: string; isStatic?: boolean; doc: string }[];
};

const M = (
  name: string, params: string, returns: string, doc: string,
  extra?: Partial<MemberSig>,
): MemberSig => ({ name, params, insert: extra?.insert ?? `${name.split('(')[0]}(${params ? '${1}' : ''})`, returns, isStatic: extra?.isStatic, throws: extra?.throws, doc });

export const JDK_INDEX: Record<string, ClassMeta> = {
  'java.lang.Thread': {
    fqn: 'java.lang.Thread', kind: 'class', doc: '线程抽象。JDK 21 起推荐 Builder：Thread.ofPlatform()/ofVirtual()',
    constructors: [
      { sig: 'Thread()', insert: 'Thread()', doc: '无任务无名线程（基本不用）' },
      { sig: 'Thread(Runnable task)', insert: 'Thread(${1:task})', doc: '指定任务' },
      { sig: 'Thread(Runnable task, String name)', insert: 'Thread(${1:task}, "${2:t1}")', doc: '任务 + 名字；命名是好的生产实践' },
      { sig: 'Thread(String name)', insert: 'Thread("${1:t1}")', doc: '只命名' },
      { sig: 'Thread(ThreadGroup group, Runnable task, String name)', doc: '指定线程组（现代代码几乎不用）' },
    ],
    members: [
      M('start()', '', 'void', '启动新线程并调用 run()；每个对象只能 start 一次'),
      M('run()', '', 'void', '线程实际执行体；直接调 run 不会开新线程', ),
      M('join()', '', 'void', '等待该线程终止；终止后产生 happens-before', { throws: ['InterruptedException'] }),
      M('join(long millis)', 'millis', 'void', '有时限的等待', { throws: ['InterruptedException'] }),
      M('interrupt()', '', 'void', '请求协作式中断（置中断标记/唤醒阻塞）'),
      M('isInterrupted()', '', 'boolean', '读中断标记，不清除'),
      M('sleep(long millis)', 'millis', 'void', '让当前线程休眠；不释放监视器锁', { isStatic: true, throws: ['InterruptedException'] }),
      M('yield()', '', 'void', '礼让调度提示（仅提示，调度器可忽略）', { isStatic: true }),
      M('currentThread()', '', 'Thread', '返回当前执行线程', { isStatic: true }),
      M('ofPlatform()', '', 'Thread.Builder.OfPlatform', '平台线程 Builder（JDK 21）', { isStatic: true }),
      M('ofVirtual()', '', 'Thread.Builder.OfVirtual', '虚拟线程 Builder（JDK 21）', { isStatic: true }),
      M('startVirtualThread(Runnable)', 'task', 'Thread', '创建并启动虚拟线程', { isStatic: true }),
      M('getName()', '', 'String', '读线程名（诊断/日志常用）'),
      M('setName(String name)', 'name', 'void', '改线程名'),
      M('setDaemon(boolean on)', 'on', 'void', '守护线程：非守护全退后 JVM 退出', ),
      M('isAlive()', '', 'boolean', '是否存活'),
      M('getState()', '', 'Thread.State', 'Java 六态之一', ),
      M('priority 相关', '', '', 'setPriority(int)/getPriority()：仅是调度提示'),
    ],
    fields: [
      { name: 'MIN_PRIORITY', type: 'int', isStatic: true, doc: '1' },
      { name: 'NORM_PRIORITY', type: 'int', isStatic: true, doc: '5（默认）' },
      { name: 'MAX_PRIORITY', type: 'int', isStatic: true, doc: '10' },
    ],
  },

  'java.lang.Object': {
    fqn: 'java.lang.Object', kind: 'class', doc: '万物根类；wait/notify 也在它身上',
    members: [
      M('wait()', '', 'void', '释放监视器并进 WaitSet；必须在 synchronized 内调用', { throws: ['InterruptedException'] }),
      M('wait(long timeout)', 'timeoutMillis', 'void', '有时限等待', { throws: ['InterruptedException'] }),
      M('notify()', '', 'void', '随机唤醒 WaitSet 中一个线程'),
      M('notifyAll()', '', 'void', '唤醒 WaitSet 全部线程'),
      M('toString()', '', 'String', '默认 类名@哈希'),
      M('equals(Object o)', 'o', 'boolean', '默认引用相等'),
      M('hashCode()', '', 'int', '标识哈希；与锁/对象头有纠缠（M05 展开）'),
    ],
  },

  'java.lang.Runnable': {
    fqn: 'java.lang.Runnable', kind: 'interface', doc: '无返回值的任务',
    members: [M('run()', '', 'void', '任务体；不抛受检异常、无返回值')],
  },

  'java.lang.System': {
    fqn: 'java.lang.System', kind: 'class', doc: '系统级入口',
    members: [
      M('currentTimeMillis()', '', 'long', '毫秒时间戳（系统时钟）', { isStatic: true }),
      M('nanoTime()', '', 'long', '纳秒计时器（测延时就它，别用 currentTimeMillis）', { isStatic: true }),
      M('getProperty(String key)', 'key', 'String', '读系统属性', { isStatic: true }),
      M('gc()', '', 'void', '建议 GC（仅建议）', { isStatic: true }),
    ],
    fields: [
      { name: 'out', type: 'java.io.PrintStream', isStatic: true, doc: '标准输出' },
      { name: 'err', type: 'java.io.PrintStream', isStatic: true, doc: '标准错误' },
    ],
  },

  'java.io.PrintStream': {
    fqn: 'java.io.PrintStream', kind: 'class', doc: '打印流',
    members: [
      M('println(String x)', '"${1:msg}"', 'void', '打印一行'),
      M('println()', '', 'void', '空行'),
      M('println(Object o)', 'o', 'void', '打印对象 toString'),
      M('print(String s)', 's', 'void', '不换行打印'),
      M('printf(String fmt, Object... args)', '"${1:fmt}", args', 'PrintStream', '格式化打印'),
    ],
  },

  'java.lang.String': {
    fqn: 'java.lang.String', kind: 'class', doc: '不可变字符串（不可变即线程安全，M07 展开）',
    members: [
      M('length()', '', 'int', '长度'),
      M('charAt(int i)', 'i', 'char', '取字符'),
      M('substring(int begin)', 'begin', 'String', '截取（新对象）'),
      M('substring(int begin, int end)', 'begin, end', 'String', '区间截取'),
      M('concat(String s)', 's', 'String', '拼接（新对象）'),
      M('equals(Object o)', 'o', 'boolean', '内容相等'),
      M('format(String fmt, Object... args)', '"fmt", args', 'String', '格式化', { isStatic: true }),
    ],
  },

  'java.lang.StringBuilder': {
    fqn: 'java.lang.StringBuilder', kind: 'class', doc: '可变拼接器（非线程安全，局部变量用）',
    members: [
      M('append(String s)', 's', 'StringBuilder', '追加（返回自身可链式）'),
      M('toString()', '', 'String', '落成字符串'),
    ],
  },

  'java.util.concurrent.locks.ReentrantLock': {
    fqn: 'java.util.concurrent.locks.ReentrantLock', kind: 'class', doc: '显式锁：可中断/可超时/可公平/多条件',
    constructors: [
      { sig: 'ReentrantLock()', insert: 'ReentrantLock()', doc: '非公平锁（默认，吞吐优先）' },
      { sig: 'ReentrantLock(boolean fair)', insert: 'ReentrantLock(${1:true})', doc: 'fair=true 为公平锁（防插队，吞吐换公平）' },
    ],
    members: [
      M('lock()', '', 'void', '获取锁；拿不到就等（不可中断）'),
      M('lockInterruptibly()', '', 'void', '等锁时可被中断', { throws: ['InterruptedException'] }),
      M('tryLock()', '', 'boolean', '立即试一下；拿到 true'),
      M('tryLock(long time, TimeUnit unit)', '${1:time}, TimeUnit.${2:MILLISECONDS}', 'boolean', '限时试锁', { throws: ['InterruptedException'] }),
      M('unlock()', '', 'void', '释放锁；必须在 finally 里调'),
      M('newCondition()', '', 'Condition', '开一个条件队列（一把锁可多个）'),
      M('isHeldByCurrentThread()', '', 'boolean', '当前线程是否持锁'),
      M('getHoldCount()', '', 'int', '当前线程重入次数'),
    ],
  },

  'java.util.concurrent.locks.Condition': {
    fqn: 'java.util.concurrent.locks.Condition', kind: 'interface', doc: '条件队列：await/signal 需持锁',
    members: [
      M('await()', '', 'void', '释放锁并等待到被 signal', { throws: ['InterruptedException'] }),
      M('signal()', '', 'void', '唤醒一个等待线程'),
      M('signalAll()', '', 'void', '唤醒全部'),
      M('awaitNanos(long nanos)', 'nanosTimeout', 'long', '限时等待，返回剩余纳秒', { throws: ['InterruptedException'] }),
    ],
  },

  'java.util.concurrent.Semaphore': {
    fqn: 'java.util.concurrent.Semaphore', kind: 'class', doc: '许可证计数：资源池/限流舱壁的底座',
    constructors: [
      { sig: 'Semaphore(int permits)', insert: 'Semaphore(${1:3})', doc: 'permits 个许可' },
      { sig: 'Semaphore(int permits, boolean fair)', insert: 'Semaphore(${1:3}, ${2:true})', doc: '可公平' },
    ],
    members: [
      M('acquire()', '', 'void', '取一张许可，不够就等', { throws: ['InterruptedException'] }),
      M('tryAcquire()', '', 'boolean', '立即试取'),
      M('release()', '', 'void', '归还许可'),
      M('availablePermits()', '', 'int', '剩余许可数'),
    ],
  },

  'java.util.concurrent.CountDownLatch': {
    fqn: 'java.util.concurrent.CountDownLatch', kind: 'class', doc: '一次性倒计门闩：等各种伙伴就绪',
    constructors: [{ sig: 'CountDownLatch(int count)', insert: 'CountDownLatch(${1:3})', doc: 'count 归零才放行' }],
    members: [
      M('await()', '', 'void', '等计数归零', { throws: ['InterruptedException'] }),
      M('countDown()', '', 'void', '计数 -1'),
      M('getCount()', '', 'long', '当前计数'),
    ],
  },

  'java.util.concurrent.atomic.AtomicInteger': {
    fqn: 'java.util.concurrent.atomic.AtomicInteger', kind: 'class', doc: 'CAS 原子整数',
    constructors: [{ sig: 'AtomicInteger(int initial)', insert: 'AtomicInteger(${1:0})', doc: '初始值' }],
    members: [
      M('get()', '', 'int', '读当前值'),
      M('incrementAndGet()', '', 'int', '先 +1 再读'),
      M('getAndIncrement()', '', 'int', '先读再 +1'),
      M('addAndGet(int delta)', 'delta', 'int', '加 delta'),
      M('compareAndSet(int expect, int update)', 'expect, update', 'boolean', 'CAS 核心硬件语义'),
      M('updateAndGet(IntUnaryOperator fn)', 'v -> ${1:v + 1}', 'int', '函数式原子更新'),
    ],
  },

  'java.util.concurrent.ExecutorService': {
    fqn: 'java.util.concurrent.ExecutorService', kind: 'interface', doc: '线程池表面接口',
    members: [
      M('execute(Runnable task)', 'task', 'void', '提交任务（无返回）'),
      M('submit(Callable<T> task)', 'task', 'Future<T>', '提交任务带结果'),
      M('shutdown()', '', 'void', '优雅停机：拒新任务，跑完队列'),
      M('shutdownNow()', '', 'List<Runnable>', '立即停机：中断在跑任务，返回队列剩余'),
      M('awaitTermination(long t, TimeUnit u)', '${1:1}, TimeUnit.${2:MINUTES}', 'boolean', '等终止', { throws: ['InterruptedException'] }),
    ],
  },

  'java.util.concurrent.Executors': {
    fqn: 'java.util.concurrent.Executors', kind: 'class', doc: '池工厂；注意 newFixedThreadPool 的无界队列风险（M07 详解）',
    members: [
      M('newFixedThreadPool(int n)', 'n', 'ExecutorService', '定长池（队列无界！）', { isStatic: true }),
      M('newCachedThreadPool()', '', 'ExecutorService', '救急池（无上限）', { isStatic: true }),
      M('newVirtualThreadPerTaskExecutor()', '', 'ExecutorService', '每任务一个虚拟线程（JDK 21）', { isStatic: true }),
    ],
  },

  'java.util.concurrent.CompletableFuture<T>': {
    fqn: 'java.util.concurrent.CompletableFuture', kind: 'class', doc: '异步编排对象（M09 主角）',
    members: [
      M('supplyAsync(Supplier<T> s)', 's', 'CompletableFuture<T>', '异步跑一个有返回任务', { isStatic: true }),
      M('thenApply(Function fn)', 'fn', 'CompletableFuture<U>', '变换结果'),
      M('thenCompose(Function fn)', 'fn', 'CompletableFuture<U>', '扁平化链式异步'),
      M('orTimeout(long t, TimeUnit u)', '${1:1}, TimeUnit.${2:SECONDS}', 'CompletableFuture<T>', '超时未完成即异常完成（JDK 9+）'),
      M('join()', '', 'T', '等结果（包装成非受检异常）'),
      M('get()', '', 'T', '等结果', { throws: ['InterruptedException', 'ExecutionException'] }),
    ],
  },
};

/** 简单名（Thread）→ 全限定名的映射表 */
export const SIMPLE_NAME: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const fqn of Object.keys(JDK_INDEX)) map[fqn.split('.').pop()!.replace(/<.*>$/, '')] = fqn;
  return map;
})();

export function lookupClass(nameOrFqn: string): ClassMeta | null {
  return JDK_INDEX[nameOrFqn] ?? JDK_INDEX[SIMPLE_NAME[nameOrFqn] ?? ''] ?? null;
}
