# 探针 X 结果：trial merge 到 jdk-25-ga（实测）

> 日期：2026-10-12；方法：在 openjdk 子模块（wasm-emscripten 分支）上 nitty-gritty 实测。
> 依赖文档：`docs/JAVABOX-JDK25-FEASIBILITY.md`（探针 X 即其"第 0 步"）。

## 环境陷阱复盘（已解决）

- 移植仓是 blob:none + shallow 克隆，`cherry-pick`/rebase 在缺父提交时会退化为"树全错"的假冲突（18k+ unmerged 假象）。修正：用 `--deepen` 把父提交链路补齐再试。

## 实测：上游对每个"我方已动/新增文件"的改动规模（jdk-21.0.10+7 → jdk-25-ga）

| 文件 | 上游加 | 上游删 | 信号 |
|---|---|---|---|
| src/hotspot/os/emscripten/*（11 个文件） | 0 | 0 | 上游无改动 |
| src/hotspot/os_cpu/emscripten_zero/*（13 个） | 0 | 0 | 上游无改动 |
| src/hotspot/share/runtime/mutex.hpp | +45 | -3 | **需适配** |
| src/hotspot/share/runtime/os.hpp | +98 | -73 | **需适配** |
| src/hotspot/share/runtime/osThread.hpp | +2 | -105 | **重写（JEP 491 关联）** |
| src/hotspot/share/runtime/park.hpp | +0 | -9 | 轻改 |
| src/hotspot/share/runtime/semaphore.hpp | 0 | 0 | 免改 |
| src/hotspot/share/runtime/threadCrashProtection.hpp | 0 | 0 | 免改 |
| src/hotspot/share/utilities/globalDefinitions_gcc.hpp | +15 | -63 | **需适配** |
| src/hotspot/os/posix/os_posix.cpp | +311 | -163 | **需适配（大）** |
| src/hotspot/os/posix/signals_posix.cpp | +45 | -43 | **需适配** |
| src/java.base/share/native/libjimage/imageDecompressor.cpp | 0 | 0 | 免改 |
| src/java.base/share/native/libjli/jli_util.h | +4 | -10 | 轻改 |
| src/java.base/unix/classes/sun/nio/fs/UnixConstants.java.template | +7 | -3 | 轻改 |
| src/java.base/unix/native/libjava/TimeZone_md.c | +8 | -25 | **需适配** |
| src/java.base/unix/native/libjava/io_util_md.c | +27 | -17 | **需适配** |
| src/java.base/unix/native/libnio/ch/NativeThread.c | 0 | 0 | 免改 |
| src/java.base/unix/native/libnio/fs/UnixNativeDispatcher.c | +118 | -179 | **需适配（大）** |
| make/hotspot/lib/JvmMapfile.gmk | +0 | -176 | **结构变化大** |
| make/modules/java.base/Lib.gmk | +114 | -143 | **需适配** |
| make/modules/jdk.jdwp.agent/Lib.gmk | +25 | -38 | 需适配 |
| make/modules/jdk.management/Lib.gmk | +15 | -18 | 需适配 |
| make/modules/jdk.sctp/Lib.gmk | +18 | -21 | 需适配 |
| make/autoconf/basic.m4 | +83 | -29 | 需适配 |
| make/autoconf/flags-cflags.m4 | +130 | -184 | **需适配（大）** |
| make/autoconf/jdk-options.m4 | +168 | -94 | **需适配（大）** |
| make/autoconf/lib-freetype.m4 | +12 | -10 | 轻改 |
| make/autoconf/libraries.m4 | +26 | -20 | 需适配 |
| make/autoconf/platform.m4 | +7 | -14 | 轻改 |
| make/common/Modules.gmk | +25 | -20 | 需适配 |
| make/common/NativeCompilation.gmk | +202 | -1108 🇨🇳 | **结构重写** |

## 探针 X 结论

- 与报告预期一致：**我方新增两大目录上游零改动，rebase 的文本冲突面可控**；冲突成本集中在 hotspot share/runtime 4 个头文件（osThread 是 JEP 491 重写痕迹）、os_posix.cpp 重构、android/native 两文件、以及 4 个 make 文件的结构改写（NativeCompilation.gmk 大改）。
- 这与报告 §3 人事预估维持一致：**编译通过前不能承诺排期**，探针 Z 是唯一可以推翻决策的环节。

## 给决策者的下一步

- 若进入探针 Y/Z：按"共享头文件→posix 层→native 层→make"的顺序逐组重挂，编到 hotspot compile-only 即冒烟。
- 若为保课程进度：先做 B 计划（M10 用本地 JDK 25 演示，浏览器端 21）作为保底，探针失败时直接退化。

本探针已恢复工作区为干净的 wasm-emscripten；产生的分支/状态均已清理。
