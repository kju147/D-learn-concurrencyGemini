# 订单导入：启动线程，并等待结果可用（第 2 版）

这份练习包里的 OrderImport.java 是下载时编辑器的当前代码，不是参考答案。
仅运行你自己编写、信任的代码。这里的测试不是沙箱，不能隔离恶意代码。

## 在 IDEA 中练习

1. 解压后打开文件夹，配置项目 SDK 和语言级别为 JDK 21。文件都在 src 目录；必要时把 src 标记为 Sources Root。
2. 只补全 OrderImport.validateAndAwait(Runnable validate)，保留签名。
3. 运行 OrderImport.main，观察示例输出；正确结果应为 validOrders=42。
4. 运行 StartJoinTests.main（不填程序参数），查看 4 组真实行为检查。
5. 按下表定位问题，修改后重跑。完成后回到网站学习下一题；本机结果暂不回传网站。

无需 Maven、JUnit 或其他依赖。也可以在项目目录使用命令行：

```text
javac --release 21 -encoding UTF-8 -d out src/OrderImport.java src/StartJoinTests.java
java -cp out OrderImport
java -cp out StartJoinTests
```

## 要解决的业务问题

生成报表前，需要把校验任务交给另一个名为 order-validator 的平台线程执行，
并等待该线程真正结束。每次调用都要执行新的传入任务一次。
等待期间如果收到中断，validateAndAwait 向调用方抛出 InterruptedException。
这是“等待方退出等待”，不等同于“工作线程自动停止”；任务取消策略放到下一题。

## 看懂测试反馈

| 检查      | 验证内容                                         | 常见问题                                          |
| --------- | ------------------------------------------------ | ------------------------------------------------- |
| thread    | 任务执行一次、不是调用线程、平台线程、指定名称   | 直接调用 run；没有 start；用了虚拟线程；名字错误  |
| await     | 测试用门闩暂时挡住工作任务，确认方法没有提前返回 | 只启动不等待；join 了错误的线程；先 join 后 start |
| values    | 多次传入不同任务，读取每次计算结果               | 硬编码 42；复用了已经结束的线程；任务漏执行       |
| interrupt | 等待被中断时，调用方收到 InterruptedException    | 捕获后只打印异常；吞掉中断；继续无限等待          |

每组测试启动独立 JVM，超时会结束该测试进程。编译失败是语法或签名问题，
FAIL 是行为不满足要求，timeout 可能是死锁、无限等待，也可能是机器过载。
不要通过延长 sleep 来“碰运气”；找出等待的对象和条件。

## 为什么不只检查打印了 42？

偶然输出正确不代表建立了等待关系。测试用 CountDownLatch 控制任务何时继续，
比单纯反复运行更能揭示缺少等待的问题；但有限次数和有限时长的测试不能证明所有调度都正确。
仍需解释：工作线程中的操作 happens-before 另一个线程成功从 join 返回。
参考：[JLS 21 §17.4.5](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html#jls-17.4.5)
和 [JDK 21 Thread API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)。

结构自检只帮助检查课堂要求的写法。行为测试不强制某种代码文本，也不防作弊，
不能替代代码审查。测试通过后，请先不用提示复写，再用自己的话解释为什么不需要把 validOrders 改成 volatile。

## 温故而知新

- 明天：不看答案重写，解释 start 和 run 的区别。
- 三天后：删掉 join，预测哪些测试会失败，再验证。
- 一周后：让校验任务更耗时，并中断等待方；观察工作线程是否仍在运行。
- 进阶追问：校验任务抛异常时，join 会替工作线程把异常抛给调用方吗？下一题用 Future 探索结果与异常传递。

本机测试、网页结构自检、未来的服务器验收是三种不同的记录。
本版本不上传代码或本机测试结果，也不把本机测试自动标记为账户学习进度。
