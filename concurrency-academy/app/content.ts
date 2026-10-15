export type Lesson = {
  id: string;
  title: string;
  outcome: string;
  kind: '概念' | '实验' | '实战' | '诊断';
  minutes: number;
  level: '基础' | '进阶' | '高级';
  jdk21?: boolean;
};

export type CourseModule = {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  color: string;
  gate: string;
  lessons: Lesson[];
};

export const courseModules: CourseModule[] = [
  {
    id: 'intuition',
    index: '01',
    title: '建立并发直觉',
    subtitle: '先分清任务、线程、并发与并行',
    color: 'cyan',
    gate: '能用吞吐量、延迟、资源利用率解释为什么要并发，而不只会说“更快”。',
    lessons: [
      {
        id: 'why',
        title: '为什么后端工程师必须懂并发',
        outcome: '识别业务中的并发边界',
        kind: '概念',
        minutes: 12,
        level: '基础',
      },
      {
        id: 'process-thread',
        title: '进程、线程、任务与调度',
        outcome: '读懂线程快照中的角色',
        kind: '概念',
        minutes: 18,
        level: '基础',
      },
      {
        id: 'concurrency-parallelism',
        title: '并发不等于并行',
        outcome: '用时间线解释二者区别',
        kind: '实验',
        minutes: 16,
        level: '基础',
      },
      {
        id: 'little-law',
        title: '吞吐、延迟与 Little’s Law',
        outcome: '估算系统在途请求数',
        kind: '实战',
        minutes: 24,
        level: '进阶',
      },
      {
        id: 'cpu-io',
        title: 'CPU 密集与 I/O 密集',
        outcome: '为工作负载选择执行模型',
        kind: '诊断',
        minutes: 20,
        level: '进阶',
      },
    ],
  },
  {
    id: 'threads',
    index: '02',
    title: '线程协作',
    subtitle: '生命周期、取消、等待与通信',
    color: 'emerald',
    gate: '能写出可停止、可超时、可传播异常，并且不会丢中断信号的后台任务。',
    lessons: [
      {
        id: 'lifecycle',
        title: '线程生命周期与状态转换',
        outcome: '从现象反推线程状态',
        kind: '概念',
        minutes: 20,
        level: '基础',
      },
      {
        id: 'interrupt',
        title: '中断不是强制停止',
        outcome: '正确恢复中断标记',
        kind: '实验',
        minutes: 22,
        level: '进阶',
      },
      {
        id: 'wait-notify',
        title: 'wait/notify 的条件队列',
        outcome: '掌握 while 等待范式',
        kind: '实验',
        minutes: 28,
        level: '进阶',
      },
      {
        id: 'park',
        title: 'park/unpark 与许可模型',
        outcome: '解释 LockSupport 的语义',
        kind: '概念',
        minutes: 18,
        level: '进阶',
      },
      {
        id: 'patterns',
        title: '保护性暂停与两阶段终止',
        outcome: '实现可靠的任务协作',
        kind: '实战',
        minutes: 35,
        level: '高级',
      },
    ],
  },
  {
    id: 'jmm',
    index: '03',
    title: 'Java 内存模型',
    subtitle: '原子性、可见性、有序性与发布',
    color: 'amber',
    gate: '看到共享可变状态时，能给出明确的 happens-before 证明，而不是凭经验说“应该没问题”。',
    lessons: [
      {
        id: 'visibility',
        title: '为什么线程看不见新值',
        outcome: '建立可见性的硬件与 JMM 直觉',
        kind: '实验',
        minutes: 18,
        level: '进阶',
      },
      {
        id: 'atomicity',
        title: 'i++ 到底丢在哪里',
        outcome: '识别复合操作竞态',
        kind: '实验',
        minutes: 20,
        level: '基础',
      },
      {
        id: 'ordering',
        title: '重排序与 as-if-serial',
        outcome: '预测双检锁错误结果',
        kind: '实验',
        minutes: 28,
        level: '高级',
      },
      {
        id: 'happens-before',
        title: 'happens-before 规则网络',
        outcome: '证明跨线程可见性',
        kind: '概念',
        minutes: 32,
        level: '高级',
      },
      {
        id: 'safe-publication',
        title: 'final 与安全发布',
        outcome: '设计不可变值对象',
        kind: '实战',
        minutes: 25,
        level: '进阶',
      },
      {
        id: 'jcstress',
        title: '用 JCStress 证伪直觉',
        outcome: '编写并解释并发压力测试',
        kind: '诊断',
        minutes: 35,
        level: '高级',
      },
    ],
  },
  {
    id: 'locks',
    index: '04',
    title: '锁与无锁算法',
    subtitle: 'monitor、AQS、CAS 与原子类',
    color: 'violet',
    gate: '能从竞争程度、公平性、阻塞成本和失败语义出发选择同步原语。',
    lessons: [
      {
        id: 'synchronized',
        title: 'synchronized 与 Monitor',
        outcome: '读懂锁升级后的真实行为',
        kind: '概念',
        minutes: 30,
        level: '进阶',
      },
      {
        id: 'lock-scope',
        title: '锁粒度与锁对象设计',
        outcome: '避免锁错对象和锁范围过大',
        kind: '实战',
        minutes: 24,
        level: '进阶',
      },
      {
        id: 'reentrant',
        title: 'ReentrantLock 与 Condition',
        outcome: '实现可超时的多条件等待',
        kind: '实验',
        minutes: 30,
        level: '进阶',
      },
      {
        id: 'aqs',
        title: 'AQS：同步器的骨架',
        outcome: '从 state 和队列理解并发工具',
        kind: '概念',
        minutes: 40,
        level: '高级',
      },
      {
        id: 'cas',
        title: 'CAS、ABA 与重试风暴',
        outcome: '识别无锁不等于无代价',
        kind: '实验',
        minutes: 32,
        level: '高级',
      },
      {
        id: 'atomic',
        title: '原子类、LongAdder 与 VarHandle',
        outcome: '选对计数与原子更新工具',
        kind: '实战',
        minutes: 28,
        level: '高级',
      },
    ],
  },
  {
    id: 'toolbox',
    index: '05',
    title: '并发工具箱',
    subtitle: '容器、线程池、队列与限流器',
    color: 'blue',
    gate: '能给线程池算账、配置背压、隔离故障，并解释每个参数与拒绝策略的业务含义。',
    lessons: [
      {
        id: 'collections',
        title: 'ConcurrentHashMap 与 Copy-on-Write',
        outcome: '按读写模型选择容器',
        kind: '实战',
        minutes: 32,
        level: '进阶',
      },
      {
        id: 'queues',
        title: 'BlockingQueue 与背压',
        outcome: '用容量表达系统承诺',
        kind: '实验',
        minutes: 28,
        level: '进阶',
      },
      {
        id: 'pool-model',
        title: '线程池参数不是八股',
        outcome: '从流量与资源预算推导参数',
        kind: '实验',
        minutes: 38,
        level: '高级',
      },
      {
        id: 'pool-failure',
        title: '线程池耗尽事故复盘',
        outcome: '识别级联阻塞与饥饿',
        kind: '诊断',
        minutes: 30,
        level: '高级',
      },
      {
        id: 'coordination',
        title: 'Latch、Barrier、Phaser、Semaphore',
        outcome: '为协作问题选择专用工具',
        kind: '实战',
        minutes: 32,
        level: '进阶',
      },
      {
        id: 'forkjoin',
        title: 'ForkJoinPool 与工作窃取',
        outcome: '判断何时适合拆分计算',
        kind: '概念',
        minutes: 26,
        level: '高级',
      },
    ],
  },
  {
    id: 'async',
    index: '06',
    title: '异步编排与响应式边界',
    subtitle: 'Future、CompletionStage 与故障传播',
    color: 'pink',
    gate: '能让并行子任务拥有清晰的超时、取消、异常传播和上下文传递语义。',
    lessons: [
      {
        id: 'future',
        title: 'Future 的等待与取消',
        outcome: '设计有界等待',
        kind: '概念',
        minutes: 18,
        level: '基础',
      },
      {
        id: 'completable',
        title: 'CompletableFuture 编排图',
        outcome: '区分 thenApply 与 thenCompose',
        kind: '实验',
        minutes: 35,
        level: '进阶',
      },
      {
        id: 'exception',
        title: '异常、超时与取消传播',
        outcome: '避免沉默失败与僵尸任务',
        kind: '实战',
        minutes: 28,
        level: '高级',
      },
      {
        id: 'context',
        title: 'ThreadLocal 与上下文传递',
        outcome: '处理日志、租户与事务边界',
        kind: '诊断',
        minutes: 26,
        level: '高级',
      },
      {
        id: 'reactive',
        title: '线程模型与响应式边界',
        outcome: '判断 MVC、虚拟线程与 WebFlux',
        kind: '实战',
        minutes: 34,
        level: '高级',
      },
    ],
  },
  {
    id: 'jdk21',
    index: '07',
    title: 'JDK 21 现代并发',
    subtitle: '虚拟线程、结构化并发与 Scoped Values',
    color: 'cyan',
    gate: '能把真实 Spring 服务迁移到虚拟线程，并用压测和 JFR 证明收益与风险。',
    lessons: [
      {
        id: 'virtual-model',
        title: '虚拟线程的 M:N 调度',
        outcome: '理解挂载、卸载与载体线程',
        kind: '概念',
        minutes: 28,
        level: '进阶',
        jdk21: true,
      },
      {
        id: 'virtual-adoption',
        title: '虚拟线程采用指南',
        outcome: '不池化虚拟线程，正确限制并发',
        kind: '实战',
        minutes: 30,
        level: '高级',
        jdk21: true,
      },
      {
        id: 'pinning',
        title: 'Pinning：收益为何突然消失',
        outcome: '用 JFR 定位固定载体线程',
        kind: '诊断',
        minutes: 32,
        level: '高级',
        jdk21: true,
      },
      {
        id: 'structured',
        title: '结构化并发（预览）',
        outcome: '组织 fan-out、取消与故障传播',
        kind: '实验',
        minutes: 38,
        level: '高级',
        jdk21: true,
      },
      {
        id: 'scoped-values',
        title: 'Scoped Values（预览）',
        outcome: '比较 ThreadLocal 的生命周期',
        kind: '实验',
        minutes: 28,
        level: '高级',
        jdk21: true,
      },
      {
        id: 'spring-virtual',
        title: 'Spring Boot 虚拟线程实战',
        outcome: '理解自动配置与资源上限',
        kind: '实战',
        minutes: 42,
        level: '高级',
        jdk21: true,
      },
    ],
  },
  {
    id: 'production',
    index: '08',
    title: '生产诊断与架构实践',
    subtitle: '从现象、证据到修复与验证',
    color: 'red',
    gate: '面对 CPU 飙高、死锁、吞吐塌陷或长尾延迟，能建立证据链并完成修复验证。',
    lessons: [
      {
        id: 'diagnostic-loop',
        title: '并发故障诊断闭环',
        outcome: '从指标到线程栈建立假设',
        kind: '诊断',
        minutes: 26,
        level: '高级',
      },
      {
        id: 'thread-dump',
        title: '线程转储与死锁定位',
        outcome: '读懂 WAITING/BLOCKED 的因果链',
        kind: '实验',
        minutes: 38,
        level: '高级',
      },
      {
        id: 'jfr',
        title: 'JFR/JMC 并发事件',
        outcome: '定位锁竞争、Pinning 与长尾',
        kind: '实验',
        minutes: 40,
        level: '高级',
      },
      {
        id: 'jmh',
        title: 'JMH：别让基准测试骗你',
        outcome: '规避预热、逃逸与死码消除',
        kind: '实验',
        minutes: 35,
        level: '高级',
      },
      {
        id: 'resilience',
        title: '隔离、限流、超时与降级',
        outcome: '把并发能力变成架构韧性',
        kind: '实战',
        minutes: 42,
        level: '高级',
      },
      {
        id: 'capstone',
        title: 'FlashFlow 订单履约系统',
        outcome: '综合应用整门课程',
        kind: '实战',
        minutes: 120,
        level: '高级',
      },
    ],
  },
];

export const glossary = [
  [
    'happens-before',
    '如果操作 A happens-before 操作 B，那么 A 的结果对 B 可见，并且 A 的执行顺序先于 B。它是 JMM 的可见性证明规则，不等同于墙上时钟的先后。',
  ],
  [
    '竞态条件',
    '程序正确性依赖多个线程执行时序，而这个时序没有被同步机制约束。',
  ],
  ['线性化', '每个并发操作看起来都在调用与返回之间的某个瞬间原子生效。'],
  ['安全发布', '让其他线程看到对象引用时，也能看到构造期间写入的完整状态。'],
  [
    '背压',
    '当下游处理能力不足时，把压力显式传回上游，而不是无限堆积任务或内存。',
  ],
  [
    'Pinning',
    '虚拟线程执行阻塞操作时无法从载体线程卸载，使宝贵的平台线程被占住。JDK 21 中常见于 synchronized 内阻塞和 native/foreign 调用。',
  ],
  ['工作窃取', '空闲工作线程从其他线程的双端队列中窃取任务，以改善负载均衡。'],
  [
    '伪共享',
    '线程修改不同变量，但变量落在同一缓存行，导致缓存行在核心之间反复失效。',
  ],
] as const;

export const reviewCards = [
  {
    id: 'r1',
    question: 'volatile 能保证 count++ 的原子性吗？',
    answer:
      '不能。volatile 只提供可见性与特定的有序性约束；count++ 是读、加、写三个动作，线程之间仍可能覆盖结果。',
    tag: 'JMM',
  },
  {
    id: 'r2',
    question: '为什么虚拟线程不应该放进线程池？',
    answer:
      '虚拟线程本身很便宜，应当“一任务一线程”。需要限制下游并发时，用 Semaphore、连接池或限流器表达资源上限。',
    tag: 'JDK 21',
  },
  {
    id: 'r3',
    question: '调用 Thread.interrupt() 会立即杀死线程吗？',
    answer:
      '不会。中断是一种协作式取消信号；目标线程要检查标记，或在可中断阻塞中处理 InterruptedException。',
    tag: '线程协作',
  },
  {
    id: 'r4',
    question: '有界队列为什么是架构承诺？',
    answer:
      '容量决定系统愿意吸收多少瞬时压力，也给过载建立明确边界。无界队列只是把拒绝变成更晚的延迟或 OOM。',
    tag: '线程池',
  },
  {
    id: 'r5',
    question: 'CompletableFuture 的 thenApply 与 thenCompose 区别？',
    answer:
      'thenApply 映射普通值；thenCompose 扁平化返回的 CompletionStage，避免得到嵌套 Future。',
    tag: '异步编排',
  },
  {
    id: 'r6',
    question: '如何证明一次并发修复真的有效？',
    answer:
      '先定义不变量，再用确定性单测验证主路径，用 JCStress 验证内存模型结果，用负载测试与 JFR 验证性能和阻塞行为。',
    tag: '生产诊断',
  },
  {
    id: 'r7',
    question: 'CPU 密集与 I/O 密集任务，哪个更需要多线程？',
    answer:
      '不缺核任务可以超出核手（CPU 密集超不过核数）；I/O 密集任务才是多线程的战场。' +
      "Little's Law：并发数 ≈ 吞吐 × 平均延迟，核数或连接池就是是一手答案。",
    tag: '基础直觉',
  },
  {
    id: 'r8',
    question: 'wait() 为什么必须放在 while 里？',
    answer:
      '因为可能虚假唤醒或者条件被别人抢先改掉；wait 返回≠条件真的成立：验-等-起来再验。',
    tag: '线程协作',
  },
  {
    id: 'r9',
    question: 'catch 里只打印 interrupted 异常、什么都不干，会让线程序收救吗？',
    answer:
      '不行——中断标记被清掉，上层无法停。正确做法：要么往上传，要么 Thread.currentThread().interrupt() 恢复标记后退出。',
    tag: '线程协作',
  },
  {
    id: 'r10',
    question: '为什么另一个线程可能永远看不见你写的 shared = false？',
    answer:
      '没有建立 happens-before。锁出临界区、volatile 写读、join 前后——都可能只读到旧值。这就是 JMM 里数据竞争的定义域。',
    tag: 'JMM',
  },
];

export const capstoneMilestones = [
  [
    '01',
    '原子库存账本',
    '从“先查再扣”竞态开始，用数据库原子更新、版本号与本地锁比较边界。',
    '竞态 · CAS · 线性化',
  ],
  [
    '02',
    '有界订单入口',
    '用有界队列、拒绝策略与幂等键建立可解释的过载行为。',
    'BlockingQueue · 背压 · 幂等',
  ],
  [
    '03',
    '履约并行编排',
    '并行调用库存、价格、风控，统一超时、取消与异常传播。',
    'CompletableFuture · 结构化并发',
  ],
  [
    '04',
    '资源舱壁隔离',
    '为数据库、支付、物流建立独立并发预算，阻断级联故障。',
    'Semaphore · 隔离 · 限流',
  ],
  [
    '05',
    '热点与缓存治理',
    '请求合并、只读快照与热 Key 分片，避免击穿和锁竞争。',
    'Future · COW · 分段',
  ],
  [
    '06',
    '虚拟线程迁移',
    '迁移阻塞式 Spring 服务，定位 Pinning，验证连接池仍是瓶颈。',
    'Virtual Thread · JFR',
  ],
  [
    '07',
    '证据化容量报告',
    '用 JMH、JCStress、压测和故障注入给出容量与正确性结论。',
    'JMH · JCStress · 可观测性',
  ],
] as const;

export const references = [
  [
    'JLS §17 Threads and Locks',
    'JMM 的规范来源：线程、锁、volatile、happens-before。',
  ],
  ['JEP 444: Virtual Threads', 'JDK 21 正式交付的虚拟线程设计与采用原则。'],
  [
    'JEP 453: Structured Concurrency',
    'JDK 21 预览特性的任务树、取消与故障传播。',
  ],
  ['OpenJDK JCStress', '并发正确性与 JMM 行为的压力测试工具。'],
  ['OpenJDK JMH', 'JVM 微基准测试框架与常见陷阱样例。'],
  [
    'Spring Task Execution & Scheduling',
    'Spring 执行器、调度器与虚拟线程集成边界。',
  ],
] as const;
