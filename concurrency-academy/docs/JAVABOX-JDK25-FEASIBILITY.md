# JavaBox JDK 21 → 25 升级可行性评估

> 评估对象：`D:\learn\concurrencykimi\javabox-research`（OpenJDK 21 Zero → Emscripten WASM 移植）
> 评估日期：2026-10-12；全部结论基于仓库内可核实证据；凡无法在本地验证的均标注 **未验证**。

---

## 1. 子模块当前状态

### 1.1 基本情况（已验证）

- 子模块 `openjdk` origin 为 `https://github.com/bmarti44/openjdk.git`（blob:none 部分克隆），当前指向远端分支 `wasm-emscripten`，HEAD = `e339656cdd1`。
- **该分支历史只有一个压缩后的提交**：`Add an Emscripten/WebAssembly OS port for HotSpot Zero`，父提交 `97a3d2372d` 被 tag `jdk-21.0.10+7` 包含（即基线是 JDK 21.0.10+7，不是 21 GA）。
- 本地无 `jdk-24`/`jdk-25` tag，远端 `git ls-remote` 未取回 25 的 tag（**未验证**，可能需先 `git fetch`），因此对 25 上游的精确 diff 规模未能直接测量。
- 工作树状态：顶层 `git status` 显示 `? openjdk`、`m third-party/libffi-emscripten`（libffi 子模块有本地改动，见 `patches/patch-libffi.diff` 37 KB）。
- **端口相对基线的 diff 规模（已验证）：51 个文件，+3008 / −27 行**。新增 24 个文件全部在 `src/hotspot/os/emscripten/`（11 个）与 `src/hotspot/os_cpu/emscripten_zero/`（13 个）两个新目录；其余 27 个是对既有文件的修改。

### 1.2 “我方文件”清单与升级受影响程度

| 类别 | 证据 | 规模 | 预计升级影响 |
|---|---|---|---|
| 全新目录 `src/hotspot/os/emscripten/`（11 文件，os_emscripten.cpp 41 KB 为主） | 端口提交内 `A` 状态 | ~1500+ 行 | **中**：文件名含 OS 后缀不参与上游重命名，但其调用的 share/posix API（os::Posix、Parker、OSThread 字段）会随 21→25 变动 |
| 全新目录 `src/hotspot/os_cpu/emscripten_zero/`（13 文件，atomic/orderAccess/inline 头） | 同上 | ~1000 行 | **小-中**：接口模板稳定，但 share 侧接口变化（如 Atomic 模板、orderAccess 语义）需跟随编译 |
| share 层补丁 `mutex.hpp / os.hpp / osThread.hpp / park.hpp / semaphore.hpp / threadCrashProtection.hpp / globalDefinitions_gcc.hpp` | 每文件 1–10 行 | 合计 ~25 行 | **小**：全部是“`#if LINUX\|\|AIX\|\|BSD` 加 `EMSCRIPTEN`”式一行开关（已抽查 park.hpp/osThread.hpp 验证），重应用成本低；风险在于这些文件本身在 24/25 被 JEP 491/Loom 重构（见 §2） |
| posix 层补丁 `os_posix.cpp (+9)`、`signals_posix.cpp (+2)` | 已验证 | 11 行 | **小** |
| make/autoconf 6 文件 + make/common、make/modules、JvmMapfile.gmk（llvm-nm 替代 GNU nm 的符号过滤段，已验证） | +99 行 | **中**：autoconf 在 21→25 有持续重构（**未逐项验证**）；JvmMapfile.gmk 段落后随上游结构调整即可 |
| java.base natives：`io_util_md.c (+37)`、`TimeZone_md.c (+9)`、`NativeThread.c (+5)`、`UnixNativeDispatcher.c`、`UnixConstants.java.template`、`jli_util.h`、`imageDecompressor.cpp` | 合计 ~70 行 | **中**：JDK 22+ 对 IO 层有持续改动（如 `poll`/`NativeThread` 信号机制随虚拟线程调整），需逐一核对 |
| 仓内（openjdk 外）构建管线：`build/build-jvm-wasm.sh`（emcc 配置，`-sUSE_PTHREADS=1 -sSHARED_MEMORY=1`，已验证）、`build/jvm-main.c`（23 KB，入口 + AWT `initIDs` 空 stub + SAB 环形缓冲 + `emscripten_futex_wake`，已验证）、`build/CompileServer.java` | — | **中**：JDK 25 若新增/删除 java.desktop 的 native 方法，jvm-main.c 的手写 stub 表需重新对账；Emscripten SDK 钉在 3.1.40（Dockerfile `ARG EMSDK_VERSION=3.1.40 # TODO: support recent version`，已验证） |
| `patches/`：patch-libffi.diff (37 KB)、patch-javabox.diff、FileDispatcherImpl.c | 已验证存在 | **中**：libffi 上游无关；FileDispatcherImpl.c 属 java.base natives 变更域 |
| `web/`、`scripts/ci.sh`、`examples/`、`tests/` | — | **小**：与 JDK 版本基本解耦 |

**关键利好（已验证）**：移植策略是“伪装成 posix”——share 层改动仅 ~25 行单行宏开关，我方主体代码是两个全新目录（~2500 行），不与上游文件重叠。这意味着**文本冲突率会极低**，升级成本大头是语义适配而非 patch 冲突。

---

## 2. 21 → 25 HotSpot 变更风险点（逐条评估）

1. **Monitor/锁子系统 —— 最大风险（方向性判断可靠，逐处影响未验证）**
   JEP 491（Synchronize Virtual Threads without Pinning，JDK 24 交付）重写了 ObjectMonitor 与 monitorenter/monitorexit 路径、轻量级锁的归属存储，并牵动解释器字节码入口、JVMTI、Parker/ParkEvent 路径。我们恰好改的正是 `park.hpp / mutex.hpp / semaphore.hpp / osThread.hpp` 这片文件，且 `os_emscripten.cpp` 自己实现线程创建与 park（已验证其使用 pthread + `os::Posix` 语义，行 120/329-370 见 os_emscripten.cpp）。24/25 中 posix Parker 实现细节若有变动（未验证），我方 emscripten 文件需同步跟进。
2. **线程模型 —— 中风险**
   21→25 之间虚拟线程从正式特性走向深度整合：**JEP 491 只有 24+ 才有**（这正是课程 M10 需要它的原因）。JDK 24 起 `java.lang.Thread` 锁字段调整、`NativeThread.c` 的 VT 信号唤醒机制有变化（未逐项验证）。我们用 Emscripten pthread 承载 Java 线程（os_emscripten.cpp 行 329-361 已验证），VT 的 mount/unmount 在 Zero + wasm 下走的是 continuation 栈拷贝，需实机验证。
3. **Zero 解释器 —— 中风险**
   Zero 本身维护稳定，但 JEP 491 要求解释器 monitorenter/monitorexit 配合（栈冻结），Zero 也必须实现对应钩子（未验证 Zero 侧具体改动量）。此外字节码/模板接口的年度清理可能导致 `emscripten_zero` 目录编译错。注意我们用的是 C++ 解释器（Zero），无汇编 port 负担，这是相对有利条件。
4. **JNI 静态符号表 —— 中小风险**
   产物是静态链接（`jvm-main.c` 手写 AWT `initIDs` stub + `JvmMapfile.gmk` 符号过滤，已验证）。JDK 25 java.desktop/java.base 的 native 方法集合若有增删，会出现 `UnsatisfiedLinkError`——这是**确定性可枚举**的问题，用一次冒烟跑 Doom/CompileServer 即可暴露，修法机械。
5. **libjava natives / libnet —— 小风险**
   已改动的 `io_util_md.c/TimeZone_md.c/NativeThread.c/UnixNativeDispatcher.c` 共 ~55 行，重应用容易；网络走 stub 的策略在 25 中无需变化（未验证 25 是否新增 net natives）。
6. **jlink 产物布局 —— 小风险**
   走 `jlink` + 静态链接路线，21→25 产物布局未见断崖式变化（未验证）；CDS/AOT（JEP 483 等）对我们不适用的概率高。
7. **Emscripten SDK —— 中风险，但可与 JDK 升级解耦**
   当前钉死 3.1.40/3.1.50（Dockerfile 注释自带 TODO，已验证）。`jvm-main.c` 依赖 `emscripten_futex_*`（patch-javabox.diff 中已修过一次环形缓冲唤醒 bug）、`Atomics.wait`/`PROXY_TO_PTHREAD`。Emscripten 4.x 对 pthread/FS/设置名有破坏性变动（未逐项验证）。**建议第一步仍钉 3.1.40 升 JDK，SDK 单独作为第二步**，避免双变量同时变化。

---

## 3. 工作量估算（人·天，区间含不确定性）

| 步骤 | 内容 | 估算 |
|---|---|---|
| 0. 探针 X：取基线 | `git fetch` jdk-25 GA tag，对 51 个文件做 trial `git rebase --onto jdk-25+0`（或 cherry-pick 该压缩提交），统计冲突 | 1–2 |
| 1. 探针 Y：文本合并 | 修复 27 个共享文件的冲突（预计绝大多数是我方单行宏 vs 上游重构），得到可 configure 的 25 树 | 2–5 |
| 2. 探针 Z：compile-only | 只编 hotspot（emcc），收敛 os_emscripten*/emscripten_zero 对 25 share API 的编译错误（Monitor/线程语义适配是重头） | 3–8 |
| 3. java.base natives 对齐 | io_util/TimeZone/NativeThread/FileDispatcherImpl + jvm-main.c stub 表对账 | 1–3 |
| 4. make/autoconf + 符号过滤 | JvmMapfile、Lib.gmk 等 | 1–2 |
| 5. 端到端冒烟 | CompileServer 跑通编译-运行闭环、Doom demo、ring buffer 并发读写压测（已有 patch-javabox.diff 的教训） | 2–4 |
| 6.（可选，独立）Emscripten SDK 升级到 4.x | 设置名、pthread、futex API 适配 | 2–5（不确定大） |
| **合计（不含第 6 步）** | | **约 10–24 天**，中枢 ~15 天 |

### 失败模式矩阵

| 失败模式 | 概率 | 影响 | 触发信号 | 缓解 |
|---|---|---|---|---|
| JEP 491 使 posix Parker/OS 线程假设失效，解释器 monitorenter 在 Zero+wasm 下 assert/挂死 | 中 | 高 | 探针 Z 中 `must not reach here`/锁竞争死锁 | 探针 Z 专项：先写 `-XX:+CountCompiledCalls` 无 JIT 的纯解释同步压测（synchronized 自旋、wait/notify、线程 join） |
| 虚拟线程 mount/unmount 的栈拷贝在 wasm 单线程模型下破坏 Atomic.ring 或堆栈布局 | 中 | 高 | VT 抛 `StackOverflowError`/随机崩溃 | M10 特性开关化：VT 实验性开启，平台线程路径保底 |
| share 层 JEP 491 重构导致我方单行宏补丁落不到原位（语义而非文本冲突） | 高 | 中 | 探针 Y 冲突计数 | 每处冲突人工对照 upstream 新文件结构重挂钩子 |
| JNI 符号遗漏导致 `UnsatisfiedLinkError` | 高 | 低 | 冒烟首跑即暴露 | 机械补 stub，成本低 |
| Emscripten 3.1.40 无法编译 JDK 25 的新 C++ 特性（需更高 clang） | 中 | 中 | configure/编译期模板错误 | 该 SDK 的 clang 16，JDK25 build 要求未验证；必要时先升到 3.1.6x 再评估 4.x |
| 构建管线（Dockerfile 50KB×2、QEMU/tinyemu 链）与 JDK 25 无关地腐化 | 低 | 低 | CI 失败 | ci.sh 已有（已验证存在） |

---

## 4. 决策建议

**建议：值得现在做，但按探针门控推进，先验证再承诺排期。** 理由：

1. **内容硬约束**：M10 的 ScopedValue（JDK 25 JEP 506 转正，API 与 21 预览不兼容）、StructuredTaskScope（25 中 API 已改为 `open()/Joiner` 范式，与 21 预览差异大）、JEP 491（**只在 24+**）兑现必须落在 25 上；若停在 21，M10 只能讲“预览版旧 API”，课程交付即过时。
2. **移植结构对 rebase 友好（已验证）**：我方代码主体是两个全新目录，共享文件补丁 ~25 行单行宏；文本冲突预计很小，真正工作量集中在 Monitor/线程语义适配这一处。
3. **成本可控**：中枢 ~15 人·天，且有明确的探针退出条件。

**先做的三个探针（计入上述 0–2 步，共约 6–15 天其中的前 ~4–8 天）：**
- **X（基线探针）**：fetch `jdk-25+0` 与 `jdk-24-ga` tag，对 `97a3d237..e339656` 做 trial rebase，统计冲突文件数与位置；同时 diff 24-ga..25-ga 中 `park.hpp/mutex.hpp/osThread.hpp/objectMonitor*` 规模，量化 §2.1 风险。**退出条件：探针 Z 的同步压测通过。**
- **Y（合并探针）**：产出可 configure 的 25 树（共享文件钩子重挂完毕）。
- **Z（编译+同步压测探针）**：hotspot compile-only 通过后，先跑 synchronized/wait-notify/虚拟线程 pin 场景的最小压测——这是唯一“可能推翻整个决策”的环节，必须最早验证。

**探针失败（Z 暴露 Zero+wasm 与 JEP 491 根本冲突）时的 B 计划**：不升级 JDK，只在课程内容上标注版本差异（21 预览 API vs 25 正式 API 对照表），M10 用外置本地 JDK 25 演示，浏览器端维持 21。该方案成本 <2 天，可将 B 计划的教案先行准备，与探针并行。

### 未验证事项汇总
- 本地无 jdk-25 tag，`ls-remote` 未取回 25 tag：25 上游精确 diff 未测量。
- JDK 24/25 中 posix Parker、`os_posix.cpp`、`NativeThread.c` 的具体变更面未逐项核对。
- JDK 25 build 对 clang/Emscripten 版本的最低要求未确认。
- 25 中 java.desktop/base natives 增删清单未生成（可在探针 X 后自动生成）。
