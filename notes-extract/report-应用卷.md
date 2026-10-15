# 并发编程·应用篇 精读报告

> 摘要1：本卷为 JVM 并发应用篇笔记（27 页），覆盖 JMH 基准、CPU/资源限制、Semaphore 连接池、Guava 限流、账户悲观/乐观模型、join/Future/CompletableFuture/BlockingQueue 五种获取结果方式、异步文件读取、缓存一致性策略、读写锁缓存、MapReduce 式分治、烧水泡茶统筹、定时调度。
> 摘要2：整体是"经典并发教学案例集"，API 用法正确、演进式讲解（join → Future → CF → wait/notify → 第三者协调）教学效果好；但全部停留在单 JVM、JDK 8/11 语境，未涉及虚拟线程、背压、舱壁、超时、JFR/JCStress 等现代工程实践。
> 摘要3：改造方向明确：手写连接池应定位为"Semaphore 教学载体"而非生产方案；限流需从单机 RateLimiter 扩展到分布式/拒绝策略/舱壁；异步部分可无缝替换为虚拟线程对比；缓存与统筹案例优良、值得保留并补延迟双删等工程细节。

---

## 一、逐节知识点清单

### 1. JMH 效率实验：多线程充分利用 CPU（第 1–5 页）
- **设计思路**：对比"单线程对 1 亿元素数组求和"（方法 d）与"4 线程各求 2500 万再合并"（方法 c），分别在双核（4 逻辑 CPU）与单核环境下跑 JMH，验证多线程加速比只在多核存在。
- **环境搭建**：选 JMH（预热 3 轮、测量 5 轮、@Fork(1)、AverageTime 模式，`@Fork(1) @Warmup(iterations=3) @Measurement(iterations=5)`）；核数限制给两种思路——虚拟机分核 或 Windows `msconfig` 限制处理器数（需重启）；明确提到最初想用 parallel stream"后来发现它有自己的问题"，改为手动 `new Thread` 控制。
- **代码要点**：`FutureTask<Integer>` 承载 4 段求和（`t1.get()+t2.get()+t3.get()+t4.get()`）；数组用 `1000_000_00` 这种下划线字面量写法。
- **结果**：双核 c=0.020s vs d=0.043s（约 2 倍加速）；单核 c=0.061s vs d=0.064s（几乎相同），结论"多核下效率提升明显，单核无收益"。输出解读了 Run complete、置信区间等字段。

### 2. 资源限制（第 5–10 页）
- **限制 CPU**：`while(true)` 空转浪费 CPU，对比三种解法——sleep（无需锁同步场景）、wait（需加锁+唤醒，同步场景）、条件变量 Lock/Condition（同 wait 但用 lock.lock()/await()/unlock()）；给出三段骨架代码伪码。
- **限制共享资源（线程数）**：`Semaphore(poolSize)` 限流，高峰期请求线程阻塞、过峰释放许可。**明确指出局限**：只适合单机线程数，限制的是线程数而不是资源数（对比 Tomcat LimitLatch）。
- **Semaphore 手写连接池**（教学版）：`Pool` 类含 poolSize、`Connection[] connections`、`AtomicIntegerArray states`（0 空闲 1 繁忙）、Semaphore。构造时许可数=资源数；`borrow()` 先 `semaphore.acquire()` 再循环 CAS `states.compareAndSet(i,0,1)` 找空闲连接；`free()` 找到连接后 `states.set(i,0)` 再 `semaphore.release()`。文字提示与"享元模式（wait/notify）版"对比，性能和可读性更好，并提醒线程数=连接数。
- **单位时间限流**：Guava `RateLimiter.create(50)` 挂在 Spring `@RestController` `@GetMapping("/test")` 上，用 ApacheBench `ab -c 10 -t 10` 压测对比：未限流 ~2469 req/s（10 秒 24706 请求，P99 16ms），限流后 54 req/s（545 请求，P50 199ms——积压排队）。

### 3. 互斥（账户模型，第 10–12 页）
- **场景**：`Account` 接口（getBalance/withdraw），`demo()` 起 1000 线程各取 10 元，初始 10000 应为 0，`System.nanoTime()` 计时。
- **悲观互斥**：`AccountSync` 用 `synchronized(this)` 包住读余额和扣款（注：代码里构造器名写成 `AccountUnsafe`，是笔记笔误）。
- **乐观重试**：`AccountCas` 用 `AtomicInteger`，`while(true){ prev=balance.get(); next=prev-amount; if(balance.compareAndSet(prev,next)) break; }`。点明"乐观锁其实不是互斥"。

### 4. 同步与异步：需要等待结果的五种实现（第 12–15 页）
- **join（同步）**：静态共享变量 `result`，t1 写值后 `t1.join()`；评价：需要外部共享变量违背封装、必须等线程结束不能配线程池。
- **Future/FutureTask（同步）**：`FutureTask`+`new Thread` 以及 `ExecutorService.submit`；评价：规避 join 缺点、可配线程池，但仍是 main 线程 `get()` 同步阻塞等待。
- **自定义实现**：指向"保护性暂停"模式（原理卷/模式篇）。
- **CompletableFuture（异步）**：`supplyAsync(..., computeService).thenAcceptAsync(..., resultService)`，双线程池分离计算与消费；评价：调用线程异步处理（其他线程同步等待）、可分离职责线程池、以任务为中心而非以线程为中心。
- **BlockingQueue（异步）**：`SynchronousQueue` + producer/consumer 两个单线程池，`queue.put/take`。

### 5. 同步与异步：不需等待结果（第 15–17 页）
- 场景：读 1.mp4 大文件，`FileReader.read()` 记录耗时。
- 四种形态依次对比：同步调用（main 阻塞 4090ms 后才 "do other things"）；裸线程异步；线程池 `service.execute` 异步（main 立即继续）；`CompletableFuture.runAsync`（注意输出日志显示跑在 `ForkJoinPool.commonPool-worker-1`，用笔记得出用了 commonPool）。

### 6. 缓存（第 17–20 页）
- **更新策略时序分析**（线程 A 查询 + 线程 B 更新交错）：
  - 先清缓存再更新库：可能出现 B 清缓存 → A 查库（x=1）→ A 回填缓存（x=1）→ B 才写库（x=2）→ 后续读旧值（错）。
  - 先更新库再清缓存：B 写库（x=2）→ A 查缓存（x=1，读到旧值但属于有效期内的正常行为）→ B 清缓存 → 之后读到新值；正常情况可接受。
  - 补充情况：A 查时恰好缓存过期/首次查询 → 查库 x=1 → B 写库 x=2 → B 清缓存 → A 回填旧值 x=1 → 一直旧值；指出概率小，引用了 facebook 论文（Scaling Memcache）。
- **读写锁实现一致性 DAO 缓存**：`GenericCachedDao<T>`，HashMap + `ReentrantReadWriteLock`。`update()` 写锁内更新 DB 并 `map.clear()`；`queryOne()` 读锁先查缓存，miss 后放读锁抢写锁，**写锁内二次检查**防止重复查库（double check）。Key 为不可变内部类 `SqlPair`（sql + params，重写 equals/hashCode，"作为 key 保证其是不可变的"）。
- **自我批评清单**：只适合读多写少、无容量控制、无过期、只单机、单一锁并发度低、update 粗暴 `map.clear()`（建议按类型分区/重设 key）；提出乐观锁 CAS 更新的方向。

### 7. 分治（第 20–23 页）
- **单词计数**：公共骨架 `demo(Supplier<Map>, BiConsumer<Map,words>)`，26 线程分别读 tmp/{i}.txt 统计词频。
  - 解法1：`ConcurrentHashMap<String, LongAdder>` + `computeIfAbsent(word, k->new LongAdder()).increment()`。
  - 解法2：`IntStream.range(1,27).parallel()` + `groupingBy(identity(), summingInt(w->1))`。
- **求和**：`AddTask3 extends RecursiveTask<Integer>`，二分 fork/join（begin==end 返回、相邻直接加、否则 fork 两半再 join 求和），`new ForkJoinPool(4).invoke(new AddTask3(1,10))`，输出展示 fork/join 遍历树结构。

### 8. 统筹（烧水泡茶，第 23–26 页）
- 需求：老王洗水壶+烧开水（1s+15 缩为 5s），小王洗茶壶+洗茶杯+拿茶叶，水开+茶叶齐才可泡茶。
- **解法1 join**：小王线程内 `t1.join()` 等老王；缺陷：倒置依赖（老王泡茶等小王茶叶）要改代码、互相 join 无法双向、无法表达"水壶交给对方"。
- **解法2 wait/notify**：共享 `kettle/tea/maked` + 同一把 lock，两边完成各自任务后 notifyAll，再 while 等待对方条件，谁后到谁泡（`maked` 标志防重复泡）。评价：解决解法1，但两人相互等待耦合。
- **解法3 第三者协调**：老王小王只 notifyAll 自己的产出，"王夫人"线程 `while(kettle.equals("冷水") || tea==null) wait()`，条件齐后由第三者泡茶——职责解耦。

### 9. 定时调度（第 26–27 页）
- 案例：每周四 18:00 执行任务。用 `LocalDateTime + now.with(DayOfWeek.THURSDAY)` 定位本次周四，已过则 `plusWeeks(1)`；`Duration.between` 算 initialDelay；`Executors.newScheduledThreadPool(2)` + `scheduleAtFixedRate(initialDelay, oneWeek)`。

> 注：任务描述中提到"交替输出"案例，本文件正文中未发现该内容（或属于其他分卷）。

---

## 二、每个应用案例的教学评价

### JMH 效率实验
- **真实度**：中。数组求和太"玩具"，但"单核无收益"的反直觉教学点是硬的。
- **过时度/深度**：浅。未讲 ping-pong 陷阱、未用 `@State`/`@Param`/`Blackhole`（代码 `return sum` 返回值避免了死代码消除这点是幸运的）、两次 run 其实可以一个 fork 内跑两个 benchmark；环境用的是 JDK 11。`msconfig` 限制核数在今天应教 `-XX:ActiveProcessorCount` 或 Docker `--cpuset-cpus`。
- **建议**：任务换成"蒙特卡罗 π/矩阵乘法"更真实；补 `-XX:ActiveProcessorCount=1` 一行参数替代重启；追加 Latency/Throughput 双模式和 `BenchmarkResults` 对比表。

### 资源限制（sleep/wait/condition 让 CPU；Semaphore；RateLimiter）
- **真实度**：busy-wait 让出 CPU 是面试级；Semaphore 限流提及 Tomcat LimitLatch 很加分——是正确的生产锚点。
- **过时度**：Guava `RateLimiter.create(50)` 同步阻塞 `limiter.acquire()` 在 2018 语境成立；今天应明确它只在单机、且与 Resilience4j RateLimiter（非阻塞/带超时）、Sentinel、网关层限流（Envoy/APISIX）分层并存。`acquire` 无脑排队到 200ms 的效果实验很好，但应追问"要不要拒绝/降级"——笔记未涉及。
- **建议**：加 tryAcquire(超时) 分支演示快速失败；对照 Tomcat maxConnections/LimitLatch 讲请求数 vs 连接数 vs 线程数三层限制。

### Semaphore 手写连接池
- **定位评价**：作为"Semaphore + CAS 数组"教学载体优秀（许可=资源数、cas 占位的两段式设计清晰）；作为生产方案已过时——HikariCP 用的是无锁 hand-off + ConcurrentBag，虚拟线程时代还需考虑虚拟线程尖峰连接风暴（连接数必须限/用 HikariCP 池限）。
- **缺失细节（原文确实没写）**：borrow 没有超时与失败重试、无连接泄漏检测、无校验（`isValid`）。笔记说了"线程数=连接数"已算诚实。
- **建议改造**：明确标注"教学示意，生产用 HikariCP"；可对比实验：同并发下 HikariCP vs 本实现 vs 享元版吞吐，Mapping 回 JMH 章节形成项目式教学；加 virtual thread + Semaphore 演示"虚拟线程天然=许可"的关系。

### 账户悲观/乐观模型
- **真实度**：经典（接近真业务的简化版），悲观/乐观对比是数据库事务教学桥梁。demo 的 1000 线程×10 元设计令误差可观测，好。
- **过时度**：未过时，但缺延伸——没有讲 jitter/重试风暴（CAS 高竞争退化）、没有交代 synchronized 在 JDK 15+ 偏向锁移除后的性能变化。补：同 case 下增线程数看 CAS 版退化为无限自旋的教学点正好接"重试放大"。

### join/Future/CF/BlockingQueue 五种方式
- **真实度/教学性**：评价语精炼（"以任务为中心"），由 join → Future → CF → 队列的演进链条优秀。CF 用了分离线程池（computeService/resultService），很工程化。
- **过时度**：`new Thread`+FutureTask 与现代 `ExecutorService.submit`/`CompletableFuture` 已够，`test4` 双池设计好。缺失：`get(timeout)` 超时、CF 异常链路（exceptionally/orTimeout/completeOnTimeout JDK9+）、commonPool 副作用（test3 实际用了 commonPool 但只在日志里见、未点破风险）。
- **建议**：加超时与取消（interrupt → DB cancel）；从今天视角补 `StructuredTaskScope`（JDK 21 incubator/preview）与 `Thread.startVirtualThread` 对照。

### 不需等待结果的异步文件读取
- 同步 vs 裸线程 vs 线程池 vs CF 的对照干净直接，最好地体现"异步但不关心结果"（fire-and-forget 应该配日志/异常兜底——原文 unhandled）；CF 默认 ForkJoinPool.commonPool 在旧 IO 场景是每个工程团队踩过的坑，笔记如实呈现了 worker 名但没有警告这一隐患，建议加红框提示。

### 缓存一致性
- **真实度**：高，写库-清库时序图是面试常客，主动引 facebook Memcache 论文说明视野到位。
- **工程化缺口**：没讲延迟双删（规避补充情况）、没讲 binlog 订阅（Canal）/TTL+随机过期、热点 key、缓存击穿穿透雪崩。读写锁 DAO 例子代码质量高（double-check 正确，key 不可变也讲了），self-critique 清单即教程的诚实部分。
- **真实业务定位**：单机读多写少仍常见（配置缓存、字典表）；高并发用 Caffeine+Redis。建议把 6 个"没考虑"扩展成改造作业列表。

### 分治
- CHM+LongAdder vs parallel stream 对照是个好实验（且默认 parallel stream 会抢 commonPool 也可点破）；RecursiveTask 二叉树 fork/join 输出教学效果好。
- **建议**：补 parallel stream 与 commonPool `ForkJoinPool` 共享风险；手写新 `ForkJoinPool(4)` 是正确实践，原文做到了。

### 烧水泡茶统筹
- 教学极佳：join → wait/notify 双向 → 第三者协调 的 3 次重构把"降低耦合"讲透了；`maked` 防双重泡茶细节好。
- **建议**：可加第 4 解——两个 CompletableFuture `thenCombine`(泡茶)，正好把 4.4 节的 CF 与统筹打通，作为综合作业；再往上可引 Flowable/RxJava 编排作延伸阅读（不超纲）。

### 定时调度
- LocalDateTime/TemporalAdjuster 写法正确优雅；但生产语境下 `scheduleAtFixedRate` 有坑：一次挂掉/压过点后续的追赶行为、异常终止后续任务、且无集群一致性。
- **建议**：对比 `scheduleWithFixedDelay`、提示异常吞没的坑（try-catch wrapper）；云原生语境应对比 XXL-JOB / ElasticJob / Quartz 集群模式 / K8s CronJob，单机调度器只能用于进程内提醒类任务。

---

## 三、时代性审计与缺口（JDK 21 / 云原生 / 微服务视角）

| 缺口 | 原文覆盖 | 缺口清单 |
|---|---|---|
| 虚拟线程（JDK 21） | 未提 | 手写线程池/`new Thread` 的情景大面积可被 `Thread.startVirtualThread`/Executors.newVirtualThreadPerTaskExecutor 取代；Semaphore 从"限制连接"升格为"虚拟线程下的并发闸门"，原文连接池案例正好是最佳切入点。 |
| JFR/JMC 诊断 | 未提 | 全部性能观察停留在 JMH/日志耗时；缺线程 dump 分析、JFR socket/lock 事件看阻塞。 |
| JCStress | 未提 | 缓存时序图、泡茶 wait 交错都是手绘时序，用 JCStress 可把"可能出错"变成可重复证伪。 |
| 背压 Backpressure | 未提 | BlockingQueue 选了 `SynchronousQueue`（零容量=天然背压）但没点破；缺 `ArrayBlockingQueue(capacity)`+`RejectedExecutionHandler`、以及响应式流的背压语义。 |
| 拒绝/降级策略 | 未提 | RateLimiter 是"排队"语义，缺 tryAcquire 快速失败、熔断（Resilience4j/Sentinel）、排队时长上限。 |
| 舱壁 Bulkhead | 未提 | 4.4 节 computeService/resultService 双池已是舱壁雏形，但未命名与展开（连接池/线程池/信号量三种舱壁）。 |
| 超时与取消 | 未提 | `get()` 无 timeout；Future.get(timeout)、CF orTimeout、HTTP 客户端超时、超时预算（deadline propagation）全缺。 |
| 重试与重试放大 | 未提 | 账户 CAS 是无限 `while(true)` 重试原型但未讨论其风险；缺指数退避 + jitter、retry budget、惊群防雪崩。 |
| 分布式任务/分布式一致性 | 明确划界（多次写"只适合单机"） | 缓存"只单机"、Semaphore"只单机"等自我认知到位；但对照物（Redis+Redisson 分布式锁、消息队列幂等、分布式任务调度）一个都没给，学习者不知道单机边界之外的世界。 |
| 云原生资源限制 | 用 msconfig/虚拟机分核 | 应为 CPU limit/cgroup、`--cpuset-cpus`、JDK 容器感知（JDK 10+）教学。 |
| CompletableFuture 进阶 | 只到 supplyAsync/thenAcceptAsync/runAsync | 缺 thenCombine/thenCompose/anyOf、异常、超时；泡茶第 3 解本可演进为 CF 编排。 |
| 监控可观测 | ab 压测在线 | 无 metrics（Micrometer）、无 trace；连接池/队列的 observable 指标未出现。 |

（审计仅基于本文件文本；未出现在原文的内容此处不臆造，凡本文件未明确讲解的均标"未提"。）
