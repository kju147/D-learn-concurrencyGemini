# 《并发编程（模式篇）》精读报告

> 由精读子代理产出；落盘自对话记录。全文 1527 行 / 33 页已通读。

## 一、卷内 9 个主题知识点

1. **保护性暂停 (Guarded Suspension)**：wait/notify 共享 GuardedObject；while 防虚假唤醒；超时版用 begin/passedTime 重算剩余 waitTime；多任务版用 Mailboxes（Hashtable\<Integer, GuardedObject\>）解耦等待者/生产者（信箱类比，remove 取出避免泄漏）。JDK 中 join、Future 即此模式。
2. **Balking**：volatile starting + synchronized 内判-置位，"发现已做过直接返回"；与保护性暂停对比（等待 vs 放弃）。
3. **顺序控制**：先 2 后 1 的 wait/notify 版 vs park/unpark 版；abc×5 交替输出三种实现（flag 轮转 / ReentrantLock+三 Condition 精准唤醒 / SyncPark 数组下标取模 unpark）。注：本卷第 399 行附近确有"交替输出"案例；所谓"串行线程封闭"一节在提取文本中**不存在**（已 grep 验证全域）。
4. **生产者/消费者**：队列解耦、容量上界=背压；手写 LinkedList+wait/notifyAll 双条件等待的 MessageQueue。
5. **工作线程/线程池**：海底捞服务员/厨师类比；固定池饥饿案例；容量公式（CPU 密集核数+1；IO 密集核数×利用率×(计算+等待)/计算）；手写线程池四步（RejectPolicy 函数式接口、自写 BlockingQueue（ReentrantLock+两个 Condition+awaitNanos）、ThreadPool+Worker（poll 超时自我移除）、五种拒绝策略含 CallerRuns）。
6. **两阶段终止**：反例 stop()/System.exit()；isInterrupted 版（catch 后必须恢复标记）；volatile 停止标记版配合 interrupt 打断 sleep。
7. **线程安全单例**：饿汉/枚举/懒汉 synchronized/DCL volatile/静态内部类五种。
8. **享元**：包装类缓存（-128~127，-Djava.lang.Integer.IntegerCache.high）、String 串池、BigDecimal/BigInteger。
9. **Pool/连接池 DIY**：Connection[]+AtomicIntegerArray+CAS 借连接；诚实列出未考虑项，推荐 druid/c3p0/commons-pool/jedis。

## 二、教学评价

例子驱动、演进式路线（先手写 JDK 原理再对照）是亮点；但整体为 JDK 8 视角，e.printStackTrace、消费者 while(true) 不可停是坏示范。

JDK 21 / 现代后端演化路径：
- GuardedSuspension → CompletableFuture / Dubbo-Netty pending responses / Kafka correlationId
- Balking → AtomicBoolean CAS / Spring @PostConstruct / 分布式锁
- 顺序控制 → CyclicBarrier 补"就绪再开始"
- 生产消费 → BlockingQueue / Kafka 消费组 / Reactor 背压
- Worker Thread → 虚拟线程复活 Thread-Per-Message；容量公式升级为 Little's Law
- 两阶段终止 → ExecutorService AutoCloseable + shutdownNow/awaitTermination + K8s graceful shutdown
- 单例 → DCL 借为 JMM 教学素材（构造逸出 + 重排）
- 享元 → 不可变性推论 + Caffeine
- Pool → HikariCP 源码导读（定位为"生产答案对照"）

## 三、遗漏模式清单（课程缺口）

- **POSA2**：Monitor Object、Active Object、Half-Sync/Half-Async、Leader/Followers、Reactor/Proactor、Acceptor-Connector
- **JCIP**：组合性/实例封闭、串行线程封闭、安全发布、读写锁/StampedLock 乐观读/CopyOnWrite、双缓冲、Latch/Barrier/Phaser 模式化、组合式 Future
- **Go/Erlang/流式**：CSP/Actor、工作窃取 ForkJoin、MapReduce/分治/并行流水线、Thread-Per-Message（虚拟线程下复活）、优雅取消/超时/熔断/Bulkhead/背压

建议补三卷：协调模式卷、结构化并发卷（虚拟线程+StructuredTaskScope+CompletableFuture 重写本卷）、分布式并发模式卷。
