# 《并发编程》应用篇 · 精读报告

> 源文件：`并发编程_应用.txt`（黑马程序员《Java 并发编程》笔记，应用篇，约 27 页 PDF 提取文本）
> 页码引用以提取文本中的 `===== Page N =====` 为准。注意：原 PDF 大量内容为截图，文本提取后顺序有打乱现象（代码与结论常跨页错位），以下按逻辑章节重组，页码标注"主要出现页"。

---

## 一、逐节内容精要

### 1. 效率：使用多线程充分利用 CPU（Page 1–5）

**1) 环境搭建（Page 1–2）**
选用 JMH 做基准测试（自动预热、多轮测量取平均）。CPU 核数限制给出两条思路：虚拟机分配核数；Windows 的 msconfig 限制（需重启，麻烦）。并行方案最初想用 parallel stream，因"它有自己的问题"放弃，改为手动 new Thread。测试用例：1 亿元素数组填充 1，对比 4 线程分片求和（`c()`）与单线程求和（`d()`），用 FutureTask 收集结果。

**2) 双核 CPU（4 逻辑处理器）（Page 2–4）**
JMH 结果：4 线程 0.020 s/op vs 单线程 0.043 s/op，结论"多核下效率提升明显，快一倍左右"。注意：是 2 物理核（超线程出 4 逻辑核），4 线程也只加速约 2 倍，符合超线程收益有限的常识。

**3) 单核 CPU（Page 4–5）**
同样的两个 benchmark 在单核下：0.061 vs 0.064 s/op，结论"性能几乎一样"——单核 CPU 上纯计算任务开多线程没有收益（甚至略有损耗）。

### 2. 限制（Page 5–9）

**限制 CPU 使用（Page 5–6）**
不要在 `while(true)` 空转浪费 CPU，可用 `yield`/`sleep` 让出 CPU；或用 `wait`/条件变量。区别讲得不错：后两种需要加锁和唤醒，适合同步场景；sleep 适合无锁场景。只给了代码骨架（sleep 循环、wait 模板、lock+condition 模板），无完整案例。

**限制共享资源使用：Semaphore（Page 6–7）**
用 Semaphore 实现限流/连接池。指出两个关键局限：只限单机线程数、限的是线程数而非资源数（对比 Tomcat LimitLatch）。给出的连接池：连接数组 + AtomicIntegerArray 状态，`semaphore.acquire()` 后再 CAS 找空闲连接。亮点是明确说"线程数和数据库连接数相等"，且与之前 wait/notify 版连接池做对比。

**单位时间内限流：Guava RateLimiter（Page 8–9）**
Spring Boot 接口 `RateLimiter.create(50)`，用 ab（ApacheBench）压测对比：限流前 10s 内 24706 请求（2469 req/s），限流后 545 请求（54 req/s）。

### 3. 互斥（Page 10–11）

取款场景（Account 接口，1000 线程各取 10 元，初始 1万，期望 0）。
**悲观互斥**：`AccountSync`，synchronized 保护读写。
**乐观重试**：`AccountCas`，AtomicInteger + CAS while 循环 compareAndSet。
强调"乐观锁其实不是互斥"。

### 4. 同步和异步（Page 12–17）

**需要等待结果**的四种实现：
- **join 实现（同步）**：静态共享变量传结果。评价：不符合封装思想、不能配线程池。——自批评的"评价"框是本篇特色。
- **Future 实现（同步）**：FutureTask；再用线程池 submit。评价：规避 join 缺点、可配合线程池；但 get 仍是调用线程同步等待。
- **自定义实现**：指向"模式篇"的保护性暂停。
- **CompletableFuture（异步）**：supplyAsync + thenAcceptAsync，分离计算线程池与结果处理线程池。评价：调用线程异步处理结果、"以任务为中心而不是以线程为中心"。
- **BlockingQueue（异步）**：SynchronousQueue 生产者/消费者传结果。

**不需要等待结果**（Page 15–17）：FileReader 读大文件示例，对比同步调用 / 普通线程 / 线程池 / CompletableFuture.runAsync 四种方式，用带时间戳的日志直观展示"do other things"与读取的先后关系。

### 5. 缓存（Page 17–20）

**缓存更新策略（Page 17–18）**："先清缓存还是先更新数据库"的经典分析：
- 先清缓存：可能查得旧值回填缓存后永久不一致（图示步骤 1–5）；
- 先更新数据库再清缓存：小概率出现"缓存恰好失效 + 并发查询慢"导致回填旧值（引用"见 facebook 论文"——指 Memcached at Facebook 的 lease 机制论文）。
结论倾向"先写库再删缓存"但承认极端情况存在。

**读写锁实现一致性缓存（Page 18–20）**：`GenericCachedDao<T>`：HashMap + ReentrantReadWriteLock；读时先读锁查缓存，未命中释放读锁、获取写锁、**二次检查**（double-check）后查库回填；写时写锁内更库并 `map.clear()`。SqlPair 作为不可变 key（equals/hashCode 基于 sql + params）。
**"注意"段很棒**：坦承缺陷——只适合单机、读多写少、无容量控制、无过期、只有一把锁（无分段）、写时清空所有 key 太粗暴，提示可按类型分区、用 CAS 乐观锁。

### 6. 分治（Page 20–23）

**单词计数（Page 20–21）**：demo 抽象框架（Supplier 提供 Map、BiConsumer 做累加）+ 26 个文件 26 线程。
- 解法 1：ConcurrentHashMap + LongAdder（`computeIfAbsent` 后 increment）。
- 解法 2：parallel stream + `Collectors.groupingBy + summingInt` 一行流式归并。

**求和（Page 21–23）**：ForkJoinPool + RecursiveTask 二分拆分（1..10 求和），打印 fork/join 日志展示工作线程与拆分结构，commonPool vs `new ForkJoinPool(4)`。

### 7. 统筹：烧水泡茶（Page 23–26）

老王：洗水壶 1s → 烧开水 15s；小王：洗茶壶 1s → 洗茶杯 2s → 拿茶叶 1s；泡茶需要开水+茶叶两者就绪，总耗时 16s。
- **解法 1：join**。小王线程内 `t1.join()` 等老王。明确列出缺陷：反过来"老王等小王"时代码要重写、两点不足（谁等谁、物品交接无法表达）。
- **解法 2：wait/notify**。共享变量 kettle/tea + 单一 lock，双方 notifyAll 后互等，用 `maked` 布尔防双重泡茶。评价：解决了解法 1 的灵活性，但两人需互相等待、职责不单一。
- **解法 3：第三者协调（王夫人）**。老王、小王只负责置位 + notifyAll，王夫人等待两个条件都满足后泡茶。职责分离更好。

### 8. 定时：定期执行（Page 26–27）

例子"每周四 18:00 执行"：`LocalDateTime.now().with(DayOfWeek.THURSDAY)` 修正时间、已过当前周四则 plusWeeks(1)、`Duration.between` 算 initialDelay、`scheduleAtFixedRate` 以 oneWeek 为周期。内容偏短，未讨论 scheduleAtFixedRate vs scheduleWithFixedDelay 的区别。

---

## 二、全部示例与案例清单

| # | 案例 | 演示内容 | 代码思路 | 质量评价 | 复用/改造建议 |
|---|------|----------|----------|----------|----------------|
| 1 | JMH 数组求和（Page 1–5） | 多核并行 vs 单核并行的速度对比；JMH 基本用法 | 1 亿元素数组，4 个 FutureTask 分片 vs 1 个 FutureTask 全量；JMH @Warmup/@Measurement/@Fork | **一般**。结论对（多核提速、单核无益），但实现粗糙：每次 benchmark 新建 4 个原生线程（浪在线程创建开销，且被测段含线程启动），单线程版也套了个 FutureTask 徒增噪声；不提 Blackhole/JMH 死代码消除；在"双核"上跑 4 线程得到 2 倍加速想当然归于"多核" | 改造：用固定线程池 + CountDownLatch 或直接 `Arrays.parallelStream`/ForkJoin；数组用 @Setup 准备；JMH 消费结果用 Blackhole。也可换成 ForkJoin 任务演示分治 |
| 2 | CPU 让出代码模板（Page 5–6） | sleep / wait / 条件变量 三种避免空转 | 仅骨架代码，无可运行示例 | **一般**。观点正确（空闲别 busy-wait、sleep 无需锁、wait 需成对），但没有可运行 demo，且 yield 几乎没讲；与真实场景（如自旋锁的退避）脱节 | 补一个"生产者空队列时忙等 vs park"的 CPU 占用对比 demo；引入 LockSupport.park/退避 |
| 3 | Semaphore 连接池（Page 6–7） | Semaphore 限共享资源、与 wait/notify 版对比 | Semaphore(poolSize) 控并发数 + AtomicIntegerArray 标记空闲 + CAS 抢位；borrow/free | **好**。代码可读、正确性有保证（许可数=资源数保证 CAS 必命中），且笔记自己点明"限线程数非限资源数"、"对比 Tomcat LimitLatch"，工程直觉好 | 复用性强，可直接进讲义。可补：tryAcquire(超时) 实现 borrow 超时、release 失败/连接销毁策略 |
| 4 | Guava RateLimiter + ab 压测（Page 8–9） | 单机 QPS 限流 | `RateLimiter.create(50)` 在 Spring Controller `acquire()`；ab -c 10 -t 10 前后对比（24706 vs 545 请求） | **一般偏好**。端到端（代码+压测数据）完整，数字直观，这是加分。但：`acquire()` 是"阻塞等待代币"而非"拒绝"——真实服务一般用 `tryAcquire()` 直接返回 429；没讲令牌桶与突发（warmup、桶容量）| 改造：示范 acquire（排队）与 tryAcquire（快速失败）两种语义；引 Sentinel/Resilience4j 作为生产方案 |
| 5 | Account 悲观锁 vs CAS（Page 10–11） | 悲观互斥与乐观重试对比 | AccountSync（synchronized）与 AccountCas（AtomicInteger CAS 循环），demo 起 1000 线程计时对比 | **一般**。概念正确，但提取文本里类名错写（`AccountSync` 类中构造器叫 `AccountUnsafe`），继承也写得不一致；且未给出两版耗时对比数据（demo 输出行没贴），说服力打折；未点明 CPA/CAS 在低冲突下更快、高冲突下空转 | 修正类定义；补上两版的实测时间；改用 `getAndAdd`/`updateAndGet` 展示标准写法（CAS while 循环容易引出 ABA 话题，可顺带一提） |
| 6 | join/Future/CompletableFuture/BlockingQueue 取结果四连（Page 12–15） | "需要等待结果"的四种方式的演进 | join+静态变量 → FutureTask → 线程池 submit → CompletableFuture 双池分离 → SynchronousQueue 乒乓 | **好**。这是本篇教学法最好的片段：每种方式跟时间戳日志 + "评价"框列出优缺点，层层递进（不能配线程池 → get 仍阻塞 → 以任务为中心的异步编排），学习路径极佳 | 直接保留。可延伸 thenCompose/thenCombine/allOf 与异常处理 exceptionally |
| 7 | FileReader 同步 vs 异步四种方式（Page 15–17） | "不需等待结果"的异步落法 | 读一个 1.mp4（示例路径硬盘编码 E 盘 4 号 students 风格）对比 main 直接调 / new Thread / 线程池 / CompletableFuture.runAsync | **一般**。目的明确（时间戳日志直观），但示例只到"执行"，主程序通过 `System.in.read()` 挂起以免 commonPool 守护线程退出——这个坑很好但没点名讲解；I/O 案例与 runAsync 默认 commonPool 的搭配也是个坑（I/O 不该上 commonPool），笔记未提 | 明示 commonPool 是守护线程、I/O 型任务应自备池；可换成 Jetty/Tomcat 里的业务示例 |
| 8 | 缓存更新策略两路推演（Page 17–18） | 先删缓存 vs 先写库 的并发时序分析 | 无代码，用 A/B 线程逐步骤时序图展示两种失效路径；引用 facebook 论文 | **好**。时序推演清晰，结论辩证（"选先写库再删缓存，但承认小概率窗口"），提到 Facebook Memcached 论文体现深度。但未给出缓解手段 | 应补：延迟双删、缓存 TTL、binlog 订阅（Canal）、分布式锁/串行化队列，才能把结论落地 |
| 9 | ReentrantReadWriteLock 缓存（Page 18–20） | 读写锁 + double-check 的按需加载缓存 | 读锁查命中；未命中升级写锁 + 二次检查；写操作写锁内更库 + clear；SqlPair 不可变 key | **好**（本篇综合质量最高的代码）。double-check 理由注释到位；缺陷清单（一页"注意"列了 6 项）非常诚实——单机、无过期、无容量、单锁、clear 全清 | 改造方向现成：分桶锁/ConcurrentHashMap、Caffeine（过期+容量+异步加载）、computeIfAbsent 简化、读写一致性问题的根本讨论（数据库与缓存双写本无强一致性方案）|
| 10 | 单词计数两种解法（Page 20–21） | 并发累加：容器级并发 vs 流式分治 | 解法1：CHM+LongAdder+26 线程；解法2：parallel stream + groupingBy+summingInt | **好**。demo 用 Supplier/BiConsumer 参数化，框架很优雅（解耦"造 Map"与"如何累"）；两条路线（显式并发容器 vs 声明式并行流）对比有教学价值 | 可加解法 3：每线程独立 Map 再合并（正是性能最好的分治思路，且能呼应"先分片再累加"主题）；可对比三者耗时 |
| 11 | ForkJoin 求和（Page 21–23） | RecursiveTask 分治、fork/join 执行轨迹 | AddTask3(begin,end)，叶阈值=2，log 打印 fork/join、ForkJoinPool(4).invoke | **一般偏好**。有完整代码与日志输出，但 1..10 太小，展示不了工作窃取/阈值选择价值；阈值定 2 产生了 10 次任务（不值得）；没对比串行；没提 commonPool 默认并行度 | 改 1..1_0000_000 求和，演示阈值（如 1000）对性能的影响；用 LongAdder/并行流对照 |
| 12 | 烧水泡茶三解法（Page 23–26） | 多任务依赖编排：join → wait/notify → 第三者协调 | 经典华罗庚统筹例子。解法1 小王 join 老王；解法2 共享 kettle/tea + 互等 + maked 防重；解法3 王夫人做协调者 | **好**。是教学设计的典范：同一问题三解，每解都自评缺陷并引出下一解，把"互等耦合 → 协调者解耦"的演进讲透了 | 直接保留。可补"解法4：CompletableFuture.thenCombine"和"解法5：CountDownLatch(2)"，与现代写法接轨 |
| 13 | 每周四 18 点定时任务（Page 26–27） | 周期任务首延计算 | with(DayOfWeek.THURSDAY)+条件 plusWeeks，Duration 得 initialDelay，scheduleAtFixedRate 周间隔 | **一般**。片段短小能工作，但没讲 atFixedRate vs withFixedDelay 的差异、异常会导致周期任务静默终止的巨大坑（未捕获异常→后续全部不再执行）、JVM 停机未重新调度 | 必补两个坑：①任务内 try-catch 保护；②Calculator 对时区/夏令时不敏感；生产场景对 Spring @Scheduled/Quartz/xxl-job 一句话带过 |

---

## 三、错误、过时或不严谨之处

1. **代码与文字错位（提取层面）**：这是 PDF 图片提取的固有问题——大量"结果/输出"标记与实际日志分离了数页（如 Page 5 顶部 "性能几乎一样" 的结论与 Page 3 的数据）。修订文档时需按逻辑顺序重排。
2. **AccountSync 类名错误（Page 11）**：`class AccountSync implements Account` 内构造器写成 `public AccountUnsafe(Integer balance)`，类名/构造名不一致，属于笔误（复制自上一节的 Unsafe 版本）。
3. **JMH 基准方法学不严谨（Page 1–2）**：benchmark `c()` 内部 `new Thread(...).start()` 把线程创建开销计入被测段；`d()` 也无谓地包了 FutureTask；未使用 JMH `Blackhole` 消费结果，依赖返回值（可）；预热仅 3 轮、测量仅 5 轮偏少；1000_000_00 这种怪异的下划线写法（应为 100_000_000）；静态数组在 static 块填充没问题，但没讲伪共享（多线程写回同一 cache line 的求和变量 sum 是局部变量，实际无害——虽说无害，但恰恰是教 false sharing 的好机会，没提）。
4. **"限流后 QPS 跟 RateLimiter.create(50) 不完全对账"（Page 8–9）**：RateLimiter 流速 50/s，ab 显示 54.46 req/s（5545 请求/10s 的现状看是 545 请求），是令牌桶初始额度 + RateLimiter 户默认值带来的误差，笔记未解释；更严重：`limiter.acquire()` 排队语义 ≠ 通常理解的"限流拒绝"。
5. **CAS 说法不严谨（Page 11）**："乐观锁思想，它其实不是互斥"——措辞可以更准确：乐观并发控制（无锁/lock-free），而非"不是互斥"这种口语化。
6. **Synchronized 缓存 S2/S3 存在共享可见性写法误导（Page 24–26）**：kettle/tea 是普通 String 静态字段，读写都在 synchronized 内（因此实际安全），但没有强调"为什么必须都在临界区内"；且读后直接 `kettle.equals("冷水")`，若把 kettle 初始化为 null 容易触发 NPE——初学者容易模仿不严谨写法。
7. **线程数和连接数相等（Page 7）**：表述正确，但文中借/还失败的兜底（borrow 出异常不 release → 许可泄漏）没有任何防御，示例缺少 try/finally 模板。
8. **与 JDK 21 相比的过时/缺位**：
   - 全文仍以 `new Thread(...)` 起手，未提 **虚拟线程（JDK 21，JEP 444）**——这直接冲击"烧水泡茶""FileReader"等 I/O 型案例的教学方式（虚拟线程下 join/Future 变得完全合理）。
   - 未提 **`StructuredTaskScope`（JDK 21 预览，后孵化）**：烧水泡茶、Join 等待多个结果是它的天然场景。
   - **ExecutorService 未实现 AutoCloseable** 的旧用法（JDK 19+ 已可 try-with-resources）。
   - CompletableFuture 部分未提 JDK 9+ 的 `orTimeout/completeOnTimeout`、Executor 默认延迟池等增强。
   - JMH 环境以 JDK 11 演示，不算过时但可注明。
9. **定时任务的致命坑未提（Page 26–27）**：`scheduleAtFixedRate` 任务抛未捕获异常后调度器静默停止后续执行，这是生产事故级知识点，应用篇不讲是明显疏漏。
10. **缓存篇 SQL 缓存用例本身可疑（Page 18）**：把 SQL 查询结果当通用缓存（基于 SqlPair key）在真实工程中很少这样做（多配合 MyBatis/ORM 二级缓存），且 `map.clear()` 全清是被自己承认的粗暴，但作为"完整示例"呈现时可能误导为可用范式。
11. **`parallel stream 有自己的问题`一笔带过（Page 1）**：没有解释（共用 commonPool、阻塞任务污染全局池、不可控并行度），错过一个重要知识点。

---

## 四、亮点内容

1. **"评价"小节贯穿全篇**：几乎每个示例后跟"评价"（join 的封装性/线程池冲突、Future get 仍是同步等待…），这是普通教程少有的自我批判意识。
2. **Semaphore 连接池与《享元模式》章节的 wait/notify 版对照**，并指出 Tomcat LimitLatch 限"资源数"——连接真实工业实现。
3. **缓存更新策略的时序推演**（Page 17–18）：A/B 双线程的步骤化推演 + 承认边界情况 + 引用 Facebook Memcached 论文，辩证不绝对，是讲并发"没有银弹"的好例子。
4. **读写锁缓存的 double-check 注释与"注意"清单**（Page 19–20）：一段代码教 double-check、两段式锁升级源、以及一段注解把实现的 6 个工程缺陷摆上台面——"教学版代码 + 缺陷自白"是最好的教态度。
5. **烧水泡茶三道阶梯式解法**：自然的"问题演进"设计（缺陷 → 下一种解法），把 wait/notify 的互等痛点和协调者模式的好处解释得很生活化，概念落地极佳。
6. **单词计数 demo 的 Supplier/BiConsumer 抽象**（Page 20）：以一次性的函数式参数解耦容器选择与累加策略，展示"并发框架如何写得不重复"。
7. **JMH 选型本身**：在教程级别就坚持"性能结论必须有 benchmark 数据"的态度，哪怕执行不严谨，这种意识很多学生教程都没有。
8. **结论大胆**：双核测试里白纸黑字说"并行加速了约一倍"、单核下"几乎一样"，敢把反直觉的真实结果写出来。

---

## 五、缺失内容（作为"应用/实战篇"明显应补）

1. **背压（Backpressure）**：本篇全是"请求的等待/拒绝"，没有任何背压模型——队列满时的策略（丢弃/降级/上游反馈）、BoundedQueue 的选择、Reactive Streams/Flow API。
2. **舱壁与故障隔离（Bulkhead）**：限流只讲了单机 QPS，未讲按业务/依赖划分的线程池隔离、信号量隔离（Hystrix/Resilience4j 思路）、共享 commonPool 的风险（Page 1 一句带过）。
3. **熔断与降级**：RateLimiter 出现却对熔断器（CircuitBreaker）、超时控制（CompletableFuture.orTimeout）、重试与幂等只字未提，"限流"脱离了"稳定性三板斧"的语境。
4. **优雅停机**：线程池 shutdown/shutdownNow/awaitTermination 的用法、Spring 容器关闭钩子、处理中任务如何安全完成——本篇多处 `service.shutdown()` 都一闪而过。
5. **线程池参数工程学**：IO 密集 vs CPU 密集的 N_threads 估算、队列类型选择（SynchronousQueue vs LinkedBlockingQueue vs ArrayBlockingQueue）、拒绝策略详解与应用场景。FJP 求和一案例没有参数工程讨论。
6. **监控与诊断**：本篇从未提及 jstack/Arthas/JFR/CPU-sampling、线程数与锁竞争指标、死锁/活锁如何排查——"应用篇"没有线上可观测性是不完整的。
7. **异步编排进阶**：烧水泡茶停留在 wait/notify——未引 `CompletableFuture.allOf/thenCombine/thenCompose`、异常传播、`StructuredTaskScope`，与 2020+ 主流写法脱节。
8. **分布式并发**：缓存篇自己承认"只适合单机"，但完全没有下一步——Redis 分布式锁（SET NX、Redisson、看门狗）、缓存穿透/击穿/雪崩（这是面试与工程都高频的章节，本篇只字未提）。
9. **虚拟线程与 JDK 21 工程实践**：何时用虚拟线程、pinning、与 synchronized 的关系、`ScopedValue` 替代 ThreadLocal——这是应用篇如今绕不开的话题。
10. **真实生产案例**：所有示例都是"教学极简版"，无一取自实际系统（如 Tomcat 连接池、日志队列、RateLimiter 在网关层）。哪怕一个真实系统的简化解构都能大幅提升"应用"二字的含金量。
11. **Spring 集成**：出现了 @RestController，但没有讲 @Async/@Scheduled 的配置陷阱（默认 SimpleAsyncTaskExecutor！）、事务与线程切换、ThreadLocal 在池化下的污染（TtlTransmittableThreadLocal）。
12. **定时任务在企业级的选择**：只讲 ScheduledExecutorService，未对比 Cron/Spring @Scheduled/Quartz/分布式调度（xxl-job、ElasticJob），也没提单节点调度的集群问题。
13. **并发数据结构选型指南**：CHM/LongAdder/BlockingQueue 各出现了，但没有一张"什么场景选什么"的对照表/决策图。

---

## 六、总体结论

本篇是一篇**教学驱动、态度诚实**的教程型应用篇：案例阶梯设计（同步→异步、join→协调者）、自评式"评价"框、认缺陷不糊弄（缓存的 6 项缺陷）都是亮点。**硬伤在于**：示例大部分停留在演示级别（JMH 用法粗糙、限流语义不准、ForkJoin 规模太小、定时任务不讲异常坑），与"实战"二字有距离；且整体停留在 JDK 8–11 时空，对 JDK 21 虚拟线程、结构化并发、现代流控/弹性工具（Resilience4j/Sentinel/Caffeine）零覆盖。作为入门讲义可用；作为"应用篇"，需配以背压、舱壁、优雅停机、监控诊断与 Spring/分布式集成，才算名副其实。
