# WASM 线程能力探针结果（JavaBox / OpenJDK 21 Zero → Emscripten）

> 状态：2026-09-22 已验证。**之前的"子线程 NPE"症状不是 JVM 线程移植故障，已查明并修复。**
> 本页回答 IMPLEMENTATION-PLAN §M-eng-0 的拆弹问题：浏览器内 WASM 判题可行。

## 结论

自构建产物（本仓库 WSL 流水线）在 **Node（对照组）和 Chrome** 中全部通过以下探针：

| 能力 | 结果 |
|---|---|
| JVM / javac 启动与编译 | ✅ 启动 ~15-30s（含 46MB 数据），小练习编译秒级 |
| start/join、Thread.currentThread、identity | ✅ |
| synchronized 监视器进出 | ✅ |
| wait/notify 含超时与唤醒 | ✅ |
| ReentrantLock + Condition | ✅ |
| ThreadPoolExecutor / Executors | ✅ |
| sleep、interrupt、park/unpark | ✅ |
| CAS 4 线程 ×2000 加一、AtomicInteger 无丢失 | ✅ |
| CompletableFuture 链式编排 | ✅ |
| ForkJoinPool.commonPool（15+ Worker） | ✅ |
| 虚拟线程（JEP 444，Thread.ofVirtual） | ✅ |
| CyclicBarrier / ThreadLocal | ✅ |
| JVM 内部线程（Finalizer/Reference Handler/Cleaner） | ✅ 正常初始化，无 NPE |
| 异常栈帧（printStackTrace 在子线程） | ✅ 有完整帧 |
| JVM 日志（-Xlog，stderr/stdout） | ✅ 经 stderr 透出 |

已知限制（设计内）：Zero 解释器 → 编译大段 JDK-import 程序会慢（秒~十秒级），练习页应控制单次编译体量；Emscripten 内存 512MB 封顶；网络原生禁用（libnet 未链接，见上游 README）。

## 修复清单（全部都在自己侧，proven）

1. **`build/jvm-main.c` stdin 环缓冲区死锁**（根因，影响最大）：
   `jvm_stdin_write()` 只在整段写完后才唤醒 reader；payload > 3072 字节时 writer 等空位、reader 等信号，双死锁。
   症状：大一点的练习在页面"运行"后永远无声无息超时。
   补丁：每写一个字节都 set Signal + futex wake。见 `javabox-research/patches/`，复制品在 WSL `/root/javabox`。
2. **`FileDispatcherImpl` natives 缺失**（emscripten 目标没有 os 子目录）：
   自构建产物在浏览器 VM init 即 `NoClassDefFoundError: java/lang/Object` —— 因为 libnio 少编 `linux/native/libnio/ch/FileDispatcherImpl.c`。
   修复：新增 `openjdk/src/java.base/emscripten/native/libnio/ch/FileDispatcherImpl.c`（transfer 系接口全部桩为 IOS_UNSUPPORTED）。
3. **浏览器缓存污染**（这解释了年前的"JavaBox 线程不稳定"误诊）：
   早期实验把运行时资产代理自上游演示站，响应带 `max-age=604800`。Emscripten 的 pthread worker 不带 `?v=` 重抓 .mjs glue，吃到的旧 glue + 新 .wasm ABI 不一致 → 一连串 LinkError / 偶发 NPE，看起来像线程移植坏了。
   修复：`app/experimental/concurrency-box/runtime/[asset]/route.ts` 现在统一 `Cache-Control: no-store`；worker 全部资产加 `?v=` 参数，无参请求 308 重定向到带参地址；本地开发用 `scripts/serve-javabox-local.mjs`（127.0.0.1:8642）+ `scripts/sync-javabox-local.ps1` 把 WSL 构建产物接进 dev server。

## 本地复现构建（WSL2）

```powershell
# 一次性（管理员）：wsl --install -d Ubuntu --no-launch；之后把发行版搬到 D:\WSL
wsl -d Ubuntu
bash /mnt/d/learn/资料-并发编程\ -\ kimi/javabox-research/scripts/setup-wsl-build.sh
# 增量重建（改了 openjdk/build 同一棵树后）
bash /mnt/d/learn/资料-并发编程\ -\ kimi/tmp/wsl-rebuild.sh   # 已在桌面生成的脚本
```

验证：

```powershell
cd concurrency-academy
node scripts/serve-javabox-local.mjs      # 本地资产 127.0.0.1:8642
npm run dev                               # 开放 http://localhost:3000/experimental/concurrency-box
node scripts/test-javabox-node.mjs <SomeProbe.java>   # Node 对照执行
```

## 待办（下一个工作流，不阻塞）

- 性能数字：单次 JVM 启动 ~15s（二次进页面有缓存后 ~5s）；单个练习判题接口建议持久 JVM + ClassLoader 隔离。
- 81KB → 76MB 数据包: 部署到 Cloudflare 时 .data 超 25MB 静态资产限制——候选托管：GitHub Release + jsDelivr CDN（单文件 50MB 内可用）、或 Cloudflare R2。见 IMPLEMENTATION-PLAN §6。
- 判题练习包 v1 格式接入 (`public/exercises/...` 已有一题模板)。
