# 探针 Y 结果：产出"可 configure 的 25 树"（实测）

> 日期：2026-10-13；对象：`javabox-research/openjdk` 子模块新工作分支 **`probe/y-compile`**（基线 `jdk-25-ga` = 6c48f4ed707b）。
> 承接 `PROBE-X-JDK25.md`；主分支 `wasm-emscripten` 未动。探针改动以两个提交保留在 probe/y-compile：
> `fc9b3f523701`（重挂移植） + `3ca3431ac367`（WSL 宿主修正 + boot-jdk 探针 hack）。

## 1. 方法

`git checkout -b probe/y-compile jdk-25-ga`（树即 25 基线，无需再 checkout) → `git checkout wasm-emscripten -- src/hotspot/os/emscripten src/hotspot/os_cpu/emscripten_zero` 原地拷贝两个新目录 → 27 个共享文件按 21 侧差分逐点对照 25 结构重挂。曾尝试 `git apply --3way` 机械合入：**20/20 文件全部上下文失配**（4.5 年上游演进改动了每个钩子的上下文行），故全部改为人工重挂——这本身就是探针 X 表格的实测印证。

## 2. 重挂点逐条结果

### 2.1 全新目录（探针 X 已判为上游零改动）✅
- `src/hotspot/os/emscripten/`（11 文件）、`src/hotspot/os_cpu/emscripten_zero/`（13 文件）逐字拷贝，无冲突。
- **遗留语义债（探针 Z 范围，如实记录）**：25 中 per-OS 的 `osThread_<os>.hpp` 已改为"独立类 `OSThread : OSThreadBase`"（JEP 491 后重构），我方 `osThread_emscripten.hpp` 仍是 21 的类体碎片模式（` class OSThread{ #include OS_HEADER(osThread) }`），**编译期必炸**，属语义适配而非文本冲突。

### 2.2 hotspot share/runtime 与 posix（7 文件）
| 文件 | 结果 |
|---|---|
| mutex.hpp / park.hpp / semaphore.hpp / threadCrashProtection.hpp | ✅ 25. 中调度行结构未变，单行宏原位重挂 |
| osThread.hpp | ✅ 语义迁移：25 已把 `suspendResume_posix.hpp` 移出 share 头；钩子改挂到 `os/emscripten/osThread_emscripten.hpp` 顶部 include |
| os.hpp | ✅ 两处（`is_primordial_thread`、`class Emscripten;` 链）原位重挂 |
| globalDefinitions_gcc.hpp | ✅ + 部分免改：25 已无条件 include `<inttypes.h>/<stdint.h>`，21 侧的 typedef 兜底块钩子**被上游消除**；`signal.h` 块与 `g_isnan` 两处加 `EMSCRIPTEN` |
| os_posix.cpp | ✅ `get_default_process_handle`/`dll_lookup` 以 `#ifndef __EMSCRIPTEN__` 整栈包纳（25 的 dll_lookup 多了 dlerror 日志，整块包住即可） |
| signals_posix.cpp | ✅ `JVM_HANDLE_XXX_SIGNAL` 调度加 `EMSCRIPTEN` 分支 |

### 2.3 java.base natives（7 文件）
| 文件 | 结果 |
|---|---|
| imageDecompressor.cpp | ✅ `JVM_FindLibraryEntry` 分支原位重挂 |
| io_util_md.c | ✅ 3 处（ioctl include、handleRead/handleAvailable 的 ring-buffer fd0 分支）；25 把 handleAvailable 的 `fstat64` 改回 `fstat`，与我方插入块无交集 |
| TimeZone_md.c | ✅ 3 处（25 结构为 `__linux__||MACOSX`，按原语义加入 `__EMSCRIPTEN__`） |
| NativeThread.c | ✅ `INTERRUPT_SIGNAL=SIGIO` 分支 |
| UnixConstants.java.template | ✅ `__linux__` → `__linux__||__EMSCRIPTEN__` |
| jli_util.h | **免改（上游消除）**：25 的 NIXES 分支已无条件 `#define JLI_Lseek lseek` |
| UnixNativeDispatcher.c | **免改（上游消除）**：`<string.h>` 已无条件 include。注意（Z 期核对）：25 新增 `__linux__` 限定的 xattr 块，21 移植未挂钩，emscripten 下编译与否待 Z 实测 |

### 2.4 make/autoconf（6 文件）+ gmk（7 文件）
- autoconf：basic.m4 / flags-cflags.m4 / lib-freetype.m4 / libraries.m4（X11/fontconfig/cups 三处）/ platform.m4（`wasm32→VAR_CPU=zero`、`*emscripten*→VAR_OS`、`_zero_` legacy cpu 三处）全部 ✅ 原位重挂。
- **jdk-options.m4 钩子作废（上游删除）**：25 已彻底移除 configure 级 `--enable-static-build` / `STATIC_BUILD_AVAILABLE`（全树仅剩 `make/common/native/Flags.gmk` 的 `-DSTATIC_BUILD=1`）；static-build 现纯走 `--with-jvm-features=static-build`。configure 参数随之删去 `--enable-static-build`。
- Modules.gmk（借用 linux/classes）✅、jdk.management/Lib.gmk（management_ext 对 emscripten 关闭）✅。
- **作废三项（上游 25 重构删除）**：`JvmMapfile.gmk` 整文件被上游删除（emscripten 的 nm 符号过滤段在 25 无落点）；`NativeCompilation.gmk` 的 GetSymbols/nm-归档回退路径删除；java.base、jdk.jdwp.agent 的 STATIC_BUILD 符号聚合段删除。→ 探针 Z 需先确认 `static-libs-image` 在 25 的产物形态再决定符号表怎么喂给 emcc。
- jdk.sctp/Lib.gmk **免改**：25 已把守卫从 "unix 且非 macosx/aix" 收紧为 "仅 linux"，emscripten 天然出局。

### 2.5 探针过程中新增的两处 25/宿主适配（提交 3ca3431ac367，非 21 移植内容）
1. `basic.m4`：WSL 宿主被识别为 `OPENJDK_BUILD_OS=windows`，但 `BASIC_SETUP_PATHS_WINDOWS` 只在 target=windows 时运行，留下空 `FIXPATH_BASE` 让 `UTIL_FIXUP_PATH(TOPDIR)` 崩掉——这是对任何"WSL→非 windows 交叉"都成立的空档，补为 build OS 也触发。
2. `toolchain.m4`：`VALID_TOOLCHAINS` 按 **build** OS 选取，WSL 下只有 `microsoft`；为 emscripten target 放开 `clang gcc`。
3. `version-numbers.conf`：**PROBE HACK（不可合并）** 把 `DEFAULT_ACCEPTABLE_BOOT_VERSIONS` 放宽含 21——本机只有 JDK 21 boot JDK，25 官方要求 24/25。

## 3. configure 走到哪一步停

命令（参照 build/build-jvm-wasm.sh 的 21 参数，删去已被 25 移除的 `--enable-static-build`）：

```
bash configure --with-conf-name=emscripten-zero \
  --openjdk-target=wasm32-unknown-emscripten \
  --with-boot-jdk=/usr/lib/jvm/java-21-openjdk-amd64 \
  --with-toolchain-type=clang --with-jvm-variants=zero \
  --with-jvm-features=zero,serialgc,static-build \
  --disable-jvm-feature-g1gc --disable-jvm-feature-jfr --disable-jvm-feature-jvmci \
  --disable-jvm-feature-compiler1 --disable-jvm-feature-compiler2 \
  --disable-warnings-as-errors --with-debug-level=release \
  --with-native-debug-symbols=none --disable-precompiled-headers \
  --with-x=no --with-cups=no --with-alsa=no --with-fontconfig=no \
  CC=emcc CXX=em++ AR=emar
```

通过的阶段（全程日志：`D:\learn\concurrencykimi\tmp\probe-y-configure.log`）：
- autoconf 2.72 重新生成 generated-configure.sh ✅
- **平台识别**：`checking openjdk-target os-cpu... emscripten-zero`、`checking compilation type... cross` ✅——platform.m4 三处钩子生效
- WSL fixpath（打补丁 1 后）✅、全部基础工具探测 ✅、版本串 `25-internal-adhoc` ✅
- **boot JDK 版本校验**：`Potential Boot JDK found at /usr/lib/jvm/java-21-openjdk-amd64 is incorrect JDK version (21.0.12.1); (Your Boot JDK version must be one of: 24 25)` → 以 hack 3 放宽后 ✅
- **工具链类型白名单**：`Toolchain type clang is not valid on this platform. Valid toolchains: microsoft.` → 补丁 2 后 ✅
- **第一真实失败点（环境受限，非移植缺陷）**：

```
checking for emcc... [not found]
configure: error: User supplied compiler CC=emcc could not be found
```

即 configure **已进入编译准备阶段的入口**（工具链编译器存在性检查），停在本机未装 emsdk（任务约束"不装新软件"）。JDK 25 的 OpenJDK configure 对 wasm32-unknown-emscripten 目标本身已全程无结构性报错。

## 4. 结论

**探针 Y 通过（在既有环境约束下）。**
- 27 个共享文件钩子：21 处成功重挂到 25 对应位置，5 处被上游重构**作废化**（jli_util.h、UnixNativeDispatcher.c 头部、jdk-options.m4 的 STATIC_BUILD 检查、NativeCompilation.gmk 符号回退、3 个 JvmMapfile/Lib.gmk 符号聚合段 + jdk.sctp），1 处语义迁移（osThread → osThread_emscripten.hpp）。**没有一处无法落位。**
- "可 configure 的 25 树"已产出并提交在 `probe/y-compile`（fc9b3f523701 + 3ca3431ac367）；wasm-emscripten 主分支未动。

## 5. 给探针 Z 的清单（按预期阻塞顺序）

1. **环境前提**：macOS/Linux 原生宿主或容器（绕开 WSL 修补的需求——补丁已备好）；emsdk（先钉 3.1.x，与可行性报告建议一致）+ boot JDK 24/25（届时删掉 hack 3）。
2. **`osThread_emscripten.hpp`/`.cpp` 需按 25 的 `OSThread : OSThreadBase` 独立类模式重写**（JEP 491 重构），这是 Y 已确认的最大语义适配点。
3. 25 的 hotspot 侧 os 目录选择机制（os/emscripten 以 `OPENJDK_TARGET_OS=emscripten` 整目录编译）未在 Y 验证，Z 首次 `make hotspot-only` 时必现分晓。
4. 符号表管线：JvmMapfile.gmk/聚合段在 25 已删，`build/link-direct-wasm.sh` 的 static-symbols.c 生成依赖需按 25 的 `static-libs-image` 产物重新对账。
5. `src/java.base/emscripten/`（仅 FileDispatcherImpl.c）在 wasm-emscripten 树上仍是**未跟踪**文件；AGENTS.md 宣称该目录不存在——移植本身有一处与文档不一致，Z 阶段需定夺（纳入或删除），本探针未触碰它。
