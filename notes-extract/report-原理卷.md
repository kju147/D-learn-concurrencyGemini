# 《并发编程（原理篇）》精读报告

> 由精读子代理产出；落盘自对话记录。全文 4318 行已逐块通读。

**摘要**：黑马风格手写并发原理教程，覆盖指令级并行→CPU 缓存/MESI→内存屏障→volatile/final→synchronized 锁升级（偏向/轻量/重量）→wait/notify/park→AQS 及 ReentrantLock/读写锁/Semaphore 源码→JDK7/JDK8 HashMap 问题与 ConcurrentHashMap 双版本实现→LinkedBlockingQueue/ConcurrentLinkedQueue 内部结构。
**核心风险**：基线为 JDK 8 时代 HotSpot（偏向锁、自旋优化、Unsafe.compareAndSwap*）；JDK 15/18 起偏向锁废弃并移除、JDK 9 起 VarHandle 取代 Unsafe CAS，"锁升级"与"CAS 工具"两处需大规模现代化。
**总体质量**：机制方向基本正确（Mark Word、CLH 队列、Semaphore PROPAGATE bug 讲得透），但有若干概念简化/小错（sfence/lfence 归因、"自旋"描述、final 写屏障表述），需按 JLS 17 与现行 HotSpot 修正。

## 1. 逐章逐节知识点清单

### 1.1 指令级并行（P1–P4）
- Clock Cycle Time = 主频倒数；CPI；IPC；CPU 执行时间公式
- 鱼罐头流水线故事；五级流水线 IF/ID/EX/MEM/WB；Pentium 4 35 级流水线因功耗废弃；SuperScalar IPC>1
- 指令重排序前提（不改变单线程结果）与两个示例；Scoreboarding、Tomasulo（寄存器重命名）

### 1.2 CPU 缓存结构（P4–P8）
- L1d/L1i/L2/L3 访问周期表；`lscpu`、`coherency_line_size`（64B）
- 地址格式 tag/index/offset；缓存读流程
- MESI 四态与读写规则
- 内存屏障 sfence/lfence 归因（有误，见 §4）

### 1.3 volatile 原理（P8–P15）
- 底层 = 内存屏障；volatile 写后写屏障、读前读屏障
- num/ready 可见性示例；强调屏障不解决指令交错（i++ 反例）
- DCL 单例完整推导：new/dup/invokespecial/putstatic，17/24 可重排 → 半构造对象
- 解决：volatile（JDK5+ 语义才成立）；末句提到 lock 前缀指令（lock cmpxchg）

### 1.4 final 原理（P15）
- final 字段写入后加写屏障（防 this 逸出读到默认值）；读端未展开（见 §4.3）

### 1.5 Monitor 原理（P16–P17）
- Mark Word → ObjectMonitor 指针；Owner/EntryList(BLOCKED)/WaitSet(WAITING)
- monitorenter/monitorexit（异常表兜底）；方法级 ACC_SYNCHRONIZED

### 1.6 锁升级（P17–P32）
- 轻量级锁：Lock Record、CAS 换 Mark Word（00）；CAS 失败→膨胀；重入压空锁记录
- 解锁：null 记录=重入计数；CAS 恢复失败→重量级解锁
- 锁膨胀：申请 ObjectMonitor，失败者进 EntryList BLOCKED
- 自旋优化：自适应自旋（JDK6+）；"Java 7 之后不能控制"（措辞不准，见 §4）
- 偏向锁（JDK 6u4）：线程 ID 写 Mark Word；64 位布局表；0x05 匿名偏向；BiasedLockingStartupDelay
- 撤销：identity hashCode / 其它线程使用 / wait/notify
- 批量重偏向（>20）、批量撤销（>40）
- 锁消除（JMH 演示 -XX:-EliminateLocks）；锁粗化一笔带过

### 1.7 wait/notify/join/park 原理（P33–P35）
- wait → WaitSet；notify → EntryList 重竞争
- join 等价 synchronized(t){while(t.isAlive()) t.wait()}
- Parker：_counter/_cond/_mutex；旅人-干粮-帐篷类比（原文底层写 Unsafe.park）

### 1.8 AQS 原理（P36–P42）
- state（volatile int + CAS）；独占/共享；tryAcquire 族
- MySync/MyLock 自实现非重入锁（教学经典）
- JSR166 起源与目标；CLH 变体 FIFO（Dummy 哨兵）；入队/出队伪代码

### 1.9 ReentrantLock 原理（P43–P55）
- 默认非公平；CAS 抢锁 → tryAcquire → addWaiter(懒建 Dummy) → acquireQueued
- 老二可再试；shouldParkAfterFailedAcquire（前驱置 SIGNAL，二次失败才 park）
- unparkSuccessor（反向找最近未取消节点）
- 可重入 state++；可打断 acquireInterruptibly（THROW_IE/REINTERRUPT）
- 公平 hasQueuedPredecessors
- ConditionObject：await（addConditionWaiter、fullyRelease、park 循环）、signal（transferForSignal -2→0 再 enq）、awaitNanos <1µs 自旋阈值

### 1.10 ReentrantReadWriteLock 原理（P62–P74）
- state 高 16 位读/低 16 位写；SHARED_UNIT
- 读 doAcquireShared → setHeadAndPropagate 链式唤醒
- 写锁条件 c!=0 && (w==0 || owner!=current)
- readerShouldBlock 防读欢快饿死写者
- doReleaseShared：SIGNAL→0→unparkSuccessor；head==0→PROPAGATE(-3)

### 1.11 Semaphore 原理（P74–P81）
- 停车场类比；nonfairTryAcquireShared 循环 CAS
- **PROPAGATE 历史 bug**（JSR166 著名 case）完整讲解，教学价值极高

### 1.12 ConcurrentHashMap 原理（P81–P98）
- JDK7 HashMap 死链复现（头插法 + 双线程扩容 → 环）
- JDK8 CHM：sizeCtl、ForwardingNode、ReservationNode、TreeBin；tabAt/casTabAt/setTabAt
- get：spread → 头节点直取/fh<0 走 nextTable/顺序遍历
- put：initTable（sizeCtl=-1）→ casTabAt → helpTransfer → synchronized 锁 bin；树化阈值 8/64
- addCount：baseCount + CounterCell[]（@Contended）+ fullAddCount
- 扩容：resizeStamp、多线程帮扩、transfer 锁 bin；"平均 1/6 节点复制"（错误，见 §4.5）
- JDK7 Segment 版本：segmentShift/Mask、scanAndLockForPut 自旋 64 次、lastRun 优化、size() 重试
- Cliff Click high scale lib 提及

### 1.13 LinkedBlockingQueue 原理（P98–P103）
- dummy head；putLock/takeLock 双锁；生产-消费并行
- put：notFull 等待；c+1<capacity 自己 signal 其它 put（防信号不足）；c==0 signalNotEmpty
- vs ArrayBlockingQueue 对比表

### 1.14 ConcurrentLinkedQueue 原理（P103–P106）
- MyQueue 模拟教学；offer 两阶段 CAS（先 CAS 尾.next 再更新 last）；hops 松弛未讲

## 2. 时代性审计（JDK 21）

| 主题 | 原文 | 现代化方向 |
|---|---|---|
| 偏向锁 | P22–P31 整章 | JEP 374（JDK15 deprecated）；JDK18 移除；→"历史博物馆"专栏，实验限定 JDK8/11 复现 |
| Unsafe | P35、P86 起大量 | JEP 193 VarHandle（JDK9+）替代；源码引读注明版本 |
| sfence/lfence | P8/P14 | 错误归因，见 §4.1 |
| 自旋措辞 | P22 "Java 7 之后不能控制" | UseSpinning 实际 JDK1.4.2/5 弃用；自适应 JDK6 起默认 |
| sun.misc.Hashing | P82/P97 | JDK7u6 引入、JDK8 移除；标记"仅历史" |
| CHM"1/6 节点" | P91 | 无据，应删（实际按 (i, i+n) 分裂，约一半） |
| CHM size() 重试 | P98 "超过 3" | 源码 RETRIES_BEFORE_LOCK=2，措辞修正 |
| 伪共享/@Contended | 几乎未提 | **必须新增专题**（CounterCell 本身就用 @Contended） |
| StampedLock/VarHandle/ForkJoin/虚拟线程 | 均缺失 | 课程补章 |
| synchronized pinning | 无 | JDK21 虚拟线程在 synchronized 内 blocking 会 pin 载体线程（JDK24 修复），M10 必讲 |

## 3. 深度/准确性问题（对照 JLS 17 / HotSpot）

1. **屏障归因错误**：HotSpot volatile 写的 StoreLoad 实际是 `lock addl $0,(%rsp)`，不是 sfence/lfence；术语应改 JMM cookbook 四屏障 LoadLoad/LoadStore/StoreStore/StoreLoad，并说明"x86 TSO 只需 StoreLoad"
2. **volatile 读**：普通 load + 编译期/后随屏障约束，无 lock；原文只说写
3. **final 语义**：应补 JLS 17.5——正确构造保证、transitive final guarantee、Alpha 需 mb 的平台差异、this 逸出无保证
4. **偏向锁引入版本**：JDK 6u4 而非"JDK 6 GA"
5. **CHM"1/6 节点"**：错误/无据，删
6. **CHM size()**：RETRIES_BEFORE_LOCK=2，原文"超过 3"含糊
7. **Parker**：是抽象概念（posix cond / win32 event / futex 实现各异），不应写成唯一结构
8. **monitorenter = 立即关联 Monitor 指针**：只在重量级成立；轻量级/偏向是 Mark Word 先变 00/101——需分阶段讲
9. **CLH "单向无锁"**：CLH 本意是"local-spin 消除 cache line 乒乓"；AQS 是可阻塞双向 CLH 变体+取消；JM精确措辞
10. **AQS state 32bit 原因**：真实原因是当年 64bit lock-free CAS 非全平台可用，非"测试结果不理想"
11. **lacking**：happens-before/synchronizes-with 形式化（JLS 17.4.5）、release/acquire 语义术语、JEP 编号引用全缺——课程要补上"从直觉到规范"的桥

## 4. 教学亮点（直接收编）

- Mark Word 64 位布局表 + JOL 实验还原（换 JDK 17 输出重拍）
- MySync/MyLock 手写 AQS 工作坊——改造成"数据库连接池限流器"
- Semaphore PROPAGATE bug——并发 bug 考古课的标杆案例
- LinkedBlockingQueue 双锁 + signal 降级
- Parker 干粮帐篷类比、锁升级"挂书包→刻名字"类比（包装成现代场景）
