# Java 并发掌握系统：课程覆盖基线

> 状态：路线冻结前的第一版基线（2026-09-01）  
> 目标运行时：JDK 21；涉及历史 JVM/JDK 实现时必须显式标注版本。  
> 课程原则：原讲义是知识输入，不是章节顺序；规范、当前 JDK 行为、可验证实验和真实工程问题共同决定教学路线。

## 1. 审计范围与结论

已逐页视觉审阅四份讲义，共 347 页：

- `并发编程.pdf`：181 页，覆盖线程基础、共享模型、JMM、无锁、不可变、线程池、同步器和并发容器。
- `并发编程_原理.pdf`：106 页，覆盖 CPU/缓存、volatile/final、Monitor、AQS、读写锁、Semaphore、HashMap/ConcurrentHashMap 和队列内部原理。
- `并发编程_模式.pdf`：33 页，覆盖 Guarded Suspension、Balking、Producer-Consumer、Worker Thread、Two-Phase Termination、Singleton、Flyweight、Pool 等模式。
- `并发编程_应用.pdf`：27 页，覆盖 JMH、资源限制、连接池、账户模型、Future/CompletableFuture/BlockingQueue、缓存、MapReduce、交替输出和调度。

`concurrent` 目录已完成 168 个 Java 文件的结构与主题清点，包含 n2/n3/n4/n5/n7/n8 主示例、模式示例、自建线程池、Web/Servlet 示例、Spring Boot 第三方调用与监控示例、JMH 及 JCStress 生成物。代码不是课程真理：每个示例进入课程前仍要逐例执行、纠错、迁移和补测。

当前网站的 8 阶段、49 课是产品原型，不是最终课程目录；JMM 可交互课只是教学质量样板，不是正式起点。

## 2. 面向不同水平的同一张地图

不维护三套互相割裂的课程，而是在同一知识图上提供三条入口：

| 学习者     | 入口                              | 必修深度                                       | 允许跳过                     | 毕业标准                                     |
| ---------- | --------------------------------- | ---------------------------------------------- | ---------------------------- | -------------------------------------------- |
| 初级开发者 | 术语、Java 语法与线程直觉预备单元 | 概念、正确 API 范式、基础实验                  | JVM 源码细节、部分性能专题   | 能写出线程安全、可停止、可测试的并发代码     |
| 中级开发者 | 入学诊断后从薄弱模块开始          | JMM 证明、工具选型、线程池与异步编排、业务实验 | 已通过挑战题的基础课         | 能设计资源边界，解释正确性并诊断常见事故     |
| 高级开发者 | 挑战测试与事故案例入口            | 原理、源码、性能验证、JDK 21、架构权衡         | 仅可跳过已通过实作验收的内容 | 能建立并发不变量、容量模型、证据链和演进方案 |

每个知识点采用五层内容：`直觉动画 → 精确定义 → 最小反例 → 可运行实验 → 业务/架构迁移`。初级学习者可以停在前三层，中高级学习者必须完成后两层。

## 3. 正式学习路线

### M00 入学诊断与预备知识

- Java 对象、引用、栈/堆、方法调用、异常与 `try/finally`
- 操作系统进程/线程最低必要知识，CPU 核、时间片、上下文切换
- 同步/异步、阻塞/非阻塞、并发/并行四组概念辨析
- 诊断题、代码阅读题、并发直觉实验；据结果生成个人路线

### M01 线程与任务：先会观察，再会创建

- 进程与线程；吞吐、延迟、利用率；CPU 密集与 I/O 密集
- `Thread`、`Runnable`、`Callable/FutureTask`，`start` 与 `run`
- 栈帧、上下文切换、线程命名、优先级、`yield`、守护线程
- `sleep`、`join`/定时 `join`、五态与 Java 六态、状态转换实验
- `interrupt` 对运行、sleep/wait/join/park 的不同影响；中断标记与恢复
- 废弃的 `stop/suspend/resume` 仅作为失败设计史讲解
- 实践：烧水泡茶任务编排、可取消文件处理器、线程快照观察

### M02 共享状态与互斥：先建立安全底线

- 共享/非共享模型、临界区、竞态条件、复合操作、原子性
- `synchronized` 代码块、实例方法、静态方法与锁对象身份
- “八锁”实验；锁粒度、锁作用域、错误锁对象
- 成员变量/局部变量/引用逃逸的线程安全分析
- 线程安全类的组合是否仍然安全；Servlet 单例并发问题
- 不变量、线性化点、安全封装、防御性复制和不可变对象
- 实践：售票、转账、账户余额、库存扣减，要求先复现再修复

### M03 线程协作与活性

- Monitor 的 Owner/EntryList/WaitSet 直觉模型
- `wait/notify/notifyAll` 的锁要求、条件循环、虚假唤醒与丢通知
- `park/unpark` 的许可模型及与中断的关系
- `join` 的协作语义；多线程结果汇合
- Guarded Suspension、Balking、Producer-Consumer、Two-Phase Termination
- 死锁、活锁、饥饿、线程饥饿死锁、哲学家就餐；锁顺序和超时规避
- `jstack/jcmd` 定位 BLOCKED/WAITING 和死锁链
- 实践：消息队列、异步响应信箱、可靠后台监控任务

### M04 Java 内存模型：从“能跑”到“能证明”

- CPU 指令流水、CPI/IPC、超标量与重排序的必要直觉
- 缓存层级、缓存行、MESI 仅作硬件直觉，不冒充 JMM 规范
- 原子性、可见性、有序性；数据竞争与 sequential consistency 保证边界
- `volatile` 读写语义、内存屏障直觉、不能保证复合操作原子性
- happens-before 规则网络及传递性证明练习
- `final` 字段语义、安全构造、安全发布、逸出
- DCL 错误与修复、不可变单例、类初始化保证
- `VarHandle` 访问模式与内存序；`Unsafe` 只作历史和内部机制阅读
- JCStress 结果分类：ACCEPTABLE、FORBIDDEN、interesting outcome
- 实践：停止标志、配置热更新、懒加载缓存、发布未完整对象事故

### M05 Monitor、显式锁与 AQS

- 对象头、Mark Word、Lock Record、Monitor 与锁膨胀的版本化讲解
- 偏向锁、批量重偏向/撤销归入“JDK 8 历史实现”；JDK 21 不作为现行路径
- 轻量级锁、自旋、重量级锁的概念边界，不把实现细节当语言规范
- `ReentrantLock`：可重入、可中断、超时、公平性、多 `Condition`
- AQS 的 `state`、独占/共享、CLH 变体队列、入队、阻塞、取消和传播
- 自定义非重入锁只用于理解 AQS，不鼓励生产重复造轮子
- `ReentrantReadWriteLock`、锁降级、缓存一致性；`StampedLock` 乐观读及陷阱
- 实践：多条件仓库、读多写少配置中心、缓存填充与失效

### M06 CAS、原子类与无锁思维

- CAS 的读取—比较—交换与重试；乐观并发的适用边界
- ABA；`AtomicStampedReference`、`AtomicMarkableReference`
- 原子整数、原子引用、原子数组、字段更新器、函数式更新
- `LongAdder/LongAccumulator` 的分散竞争与非原子快照语义
- 缓存行与伪共享、`@Contended`、测试误区
- 自旋锁、公平性、退避与重试风暴；lock-free 不等于 wait-free
- 实践：高竞争指标计数器、状态机、CAS 库存实验

### M07 平台线程池、调度与并行计算

- 从任务队列到自建线程池：Worker、BlockingQueue、拒绝策略
- `ThreadPoolExecutor` 七参数、执行路径、运行状态、线程工厂
- 有界/无界队列的业务含义；拒绝、降级、背压与容量承诺
- `execute/submit/invokeAll/invokeAny`；异常可见性与 `afterExecute`
- `shutdown/shutdownNow/awaitTermination` 与优雅停机
- 线程池饥饿死锁、嵌套提交、不同业务池隔离
- `Timer` 的失败设计与 `ScheduledThreadPoolExecutor`；周期任务异常处理
- Tomcat 请求线程模型与 Spring 执行器边界
- Fork/Join、工作窃取、RecursiveTask、并行流及 common pool 污染
- Worker Thread 模式及 CPU/I/O 线程数估算；Little's Law 与实测校准
- 实践：文件批处理、定时对账、下游调用池、过载事故复盘

### M08 同步器、队列与并发容器

- `Semaphore` 许可、公平性、资源池和并发预算
- `CountDownLatch`、`CyclicBarrier`；新增 `Phaser` 的分阶段协作
- `BlockingQueue` 家族和选择：Array/Linked/Priority/Delay/Synchronous
- `ConcurrentLinkedQueue` 的非阻塞队列直觉
- `ConcurrentHashMap`、原子复合 API、并发计数、弱一致迭代
- JDK 7 Segment 与 JDK 8 数组/CAS/synchronized/树化作为实现演进史
- JDK 7 HashMap 并发扩容死链作为事故史，不作为 JDK 21 现象
- `CopyOnWriteArrayList` 的快照迭代、写放大与一致性边界
- 实践：连接池、限流舱壁、词频统计、热点读快照、延迟任务

### M09 Future、CompletableFuture 与异步图

- Future 等待、超时、取消和异常包装；阻塞式汇合
- `CompletableFuture/CompletionStage` 的变换、组合、竞速与汇合
- `thenApply/thenCompose`，`thenCombine/allOf/anyOf`
- 默认执行器、同步/Async 方法的线程语义、阻塞污染
- 异常、超时、取消传播；`orTimeout/completeOnTimeout`
- ThreadLocal/MDC/SecurityContext/事务上下文跨线程边界
- Flow/Reactive Streams 与背压概念；MVC、WebFlux、异步链的选择边界
- 实践：聚合三个下游服务，统一 deadline、部分失败和回退策略

### M10 JDK 21 现代并发

- 平台线程与虚拟线程；M:N、载体线程、挂载/卸载
- `Thread.ofVirtual`、`startVirtualThread`、`newVirtualThreadPerTaskExecutor`
- 虚拟线程提升高并发阻塞 I/O 吞吐，不提升 CPU 任务速度
- 一任务一虚拟线程，不池化；用 Semaphore/连接池表达资源上限
- JDK 21 的 pinning 条件、JFR 事件、`jcmd` 虚拟线程转储
- ThreadLocal 的内存/生命周期风险；Scoped Values（JDK 21 预览）
- Structured Concurrency（JDK 21 预览）：任务树、截止时间、失败与取消传播
- 预览 API 必须与正式 API 分层，不承诺跨 JDK 版本源码兼容
- 实践：Spring MVC 阻塞服务迁移、JDBC 连接池瓶颈、pinning 诊断

### M11 并发测试、性能与生产诊断

- 确定性测试：屏障、锁存器、可控调度、超时和不变量断言
- JCStress 验证内存模型与竞态结果；不以“跑一万次没错”证明正确
- JMH：预热、fork、死码消除、常量折叠、状态作用域和错误基准
- 端到端压测：吞吐、p95/p99、排队时间、利用率、饱和点
- 线程 dump、`jcmd`、JFR/JMC：锁竞争、阻塞、分配、虚拟线程事件
- CPU 飙高、死锁、线程池耗尽、长尾延迟、内存堆积的诊断闭环
- 正确性证据、性能证据、可观测证据、故障注入证据四件套

### M12 Spring 与真实业务架构

- Spring Boot 的 `TaskExecutor`、`@Async`、`TaskScheduler`、`@Scheduled`
- 异步方法异常处理、代理/自调用、事务边界、上下文传播
- MVC + 平台线程、MVC + 虚拟线程、WebFlux 的负载与组织模型差异
- Tomcat/Servlet 容器、JDBC/HTTP 连接池与线程模型的资源联动
- 批处理、消息消费、缓存重建、热点 Key、分布式任务的本地并发边界
- 限流、舱壁、背压、超时、重试、熔断、幂等；避免重试放大
- 并发控制与数据库锁、乐观锁、唯一约束、消息至少一次投递的组合

### M13 集大成项目：FlashFlow 订单履约系统

项目不是单一“秒杀 Demo”，而是一组逐步暴露问题的同一业务系统：

1. 原子库存与订单状态机：竞态、不变量、CAS/数据库原子更新。
2. 有界接入层：队列、拒绝、幂等键、背压和过载响应。
3. 履约 fan-out：价格、库存、风控、支付的超时/取消/异常传播。
4. 资源舱壁：数据库、支付、物流分别设置并发预算和降级策略。
5. 热点治理：请求合并、缓存一致性、Copy-on-Write/分段思路。
6. 平台线程池版本：容量推导、饥饿故障、优雅停机。
7. JDK 21 虚拟线程版本：迁移、连接池约束、pinning 观测。
8. Spring 上下文版本：MDC、安全、事务与异步边界。
9. 正确性验收：单测、JCStress、故障注入和数据一致性报告。
10. 性能验收：JMH、端到端压测、JFR 和容量规划报告。

## 4. 讲义知识点覆盖对账

| 原讲义知识群                                  | 正式模块    | 处理方式                           |
| --------------------------------------------- | ----------- | ---------------------------------- |
| 线程创建、API、状态、join/interrupt/daemon    | M01         | 保留并重写案例，补可观察实验       |
| synchronized、线程安全分析、wait/notify、活性 | M02-M03     | 拆为安全与协作两层，补不变量       |
| JMM、volatile、final、DCL                     | M04         | 规范化为 happens-before 证明路线   |
| Monitor、锁升级、AQS、显式锁                  | M05         | 区分规范、HotSpot 实现和历史版本   |
| CAS、ABA、原子类、LongAdder、伪共享、Unsafe   | M06         | 补 VarHandle、基准与适用边界       |
| 自建线程池、TPE、Timer、Tomcat、ForkJoin      | M07         | 补异常、停机、背压、容量与 Spring  |
| 同步器、并发容器及源码                        | M08         | 保留原理，JDK 7/8 内容标历史       |
| Future、CompletableFuture、BlockingQueue 应用 | M09         | 补完整编排、失败和上下文语义       |
| 保护性暂停、Balking、生产者消费者、两阶段终止 | M03/M07     | 作为问题模式，不单独堆设计模式名词 |
| 单例、享元、连接池、缓存、MapReduce、交替输出 | M04/M08/M11 | 分配到其解决的真实问题中           |
| JMH 与 JCStress                               | M04/M11     | 升级为课程验收工具，而非演示附件   |

## 5. 原资料之外必须新增的知识

- JDK 21 虚拟线程、Structured Concurrency（预览）、Scoped Values（预览）
- VarHandle 与分层内存序；偏向锁等历史实现的版本迁移说明
- ThreadLocal、MDC、安全与事务上下文传播
- CompletableFuture 的 deadline、取消、异常和执行器污染
- Phaser、Flow/Reactive Streams、并行流 common pool 风险
- 并发测试方法论、JCStress/JMH/JFR 的系统化实作
- Little's Law、排队、饱和、背压、舱壁、重试放大和容量预算
- Spring Boot/Tomcat/JDBC/HTTP 客户端/消息消费的资源联动
- 数据库、缓存、消息和本地并发共同维持业务不变量的实践

## 6. 内容生产的硬性验收

一节课只有同时满足以下条件才可标记为“完成”：

1. 说明先修知识、学习目标、术语和不保证的边界。
2. 至少一个可预测结果的动画或时间线，而非装饰动画。
3. 至少一个可运行的错误样例和一个修复样例。
4. 核心模块至少两道必须由学习者手写的代码题；选择题不能单独构成通关条件。
5. 手写代码必须经过真实编译、自动测试或不变量断言，不以字符串匹配或控制台截图作为最终通过标准。
6. 有一个真实业务迁移题，并解释错误选择的代价。
7. 高级层必须给出规范/官方资料来源和版本标签。
8. 生成提取练习、间隔复习卡和跨模块综合题。
9. 涉及性能必须有 JMH/负载证据；涉及 JMM 必须有证明或 JCStress 证据。

## 7. 下一实施顺序

1. 将本基线转成机器可检查的 `curriculum.json`，每个知识点拥有唯一 ID、先修边和来源映射。
2. 先完成 M00-M01，而不是继续扩写 JMM；让零基础学习者真正可以入门。
3. 同时把现有 JMM 课升级为纵向质量标杆：真实 Java 21 Runner、自动判题、JCStress 结果。
4. 完成 M02-M04 后做第一次公开内测；覆盖安全、协作、JMM 的完整闭环。
5. 再扩展工具箱、JDK 21、Spring 实战和 FlashFlow。
