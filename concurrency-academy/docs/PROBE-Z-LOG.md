# PROBE-Z-LOG — JDK 21→25 移植编译收敛记录

分支：`probe/y-compile`（基于 jdk-25-ga）。目标：`make CONF=emscripten-zero hotspot` 全量过编。

## 第 1 波：globals.hpp:2018 → 修法

- **错误**：`src/hotspot/share/runtime/globals.hpp:2018` — `too few arguments provided to function-like macro invocation` / `unknown type name 'RUNTIME_OS_FLAGS'`。
- **成因**：`src/hotspot/os/emscripten/globals_emscripten.hpp` 的 `RUNTIME_OS_FLAGS` 还是 JDK 21 的 7 参签名（含 `notproduct`）；JDK 25 里 `notproduct` 已移除，宏臂为 6 参。
- **修法**：把 `RUNTIME_OS_FLAGS(develop, develop_pd, product, product_pd, range, constraint)` 改成 25 的 6 参空宏（对齐 globals_linux.hpp 的上游签名）。
- **备注**：同波出现的 `accessBackend.hpp` `HeapOopType` 错误位于 `#include "runtime/globals.hpp"` 之后的级联区，预计随 globals 修复消失；未级联消失则按下波独立处理。
- **结果**：级联消失，未单独出现。✅

## 第 2 波：precompiled.hpp 不存在

- **错误**：`os_cpu/emscripten_zero/javaThread_emscripten_zero.cpp:26` 等 — `fatal error: 'precompiled.hpp' file not found`。
- **成因**：25 configure 禁用预编译头且头文件体系调整，21 移植各 .cpp 顶部 `#include "precompiled.hpp"` 全部失效。
- **修法**：删 `javaThread_emscripten_zero.cpp`、`vm_version_emscripten_zero.cpp`、`attachListener_emscripten.cpp` 的该 include（attachment 文件顺带对齐 25 已删除的 `pd_find_operation`/`pd_set_flag`）。

## 第 3 波：os 层头文件与 OSThread 类体

- **错误**：`os_emscripten.cpp:27`、`os_emscripten_zero.cpp:30` — `'code/icBuffer.hpp' file not found`；`osThread_emscripten.cpp:34` — `pthread_t` 不能用 `nullptr` 初始化；`os_posix.cpp:184` — `mincore` 第三参类型不匹配。
- **修法**：osthread_emscripten.hpp/cpp 按 25（JEP 491 后）`OSThread : OSThreadBase` 独立类模式重写（对照 osThread_linux.hpp，含构造/析构、`thread_id_for_printing() override`）；移除两处 icBuffer.hpp include（上游已删该头）；`os_posix.cpp:99` `mincore_vec_t` 注：本波先误用不存在的 `EMSCRIPTEN_ONLY` 宏，第 4 波改为 `#if defined(LINUX) || defined(EMSCRIPTEN)`。
- ⚠️ **教训记录**：移植时"JVM 内部线程 + Park/Parker"注释判断正确——25 的 `SuspendResume sr;` 成员仍在 per-OS 头中，照抄 linux 结构即可；`_thread_type` 已被上游移除（`thr_type` 现由 `os::ThreadType` 在 create_thread 内直接使用），删 `set_thread_type` 调用。

## 第 4 波：os_emscripten_zero 接口签名 + os_emscripten 过期 include

- **错误**：`os_emscripten_zero.cpp:225/232` — `current_stack_base()/current_stack_size()` 与 25 的 `os` 声明不符；`os_posix.cpp:99` EMSCRIPTEN_ONLY 未定义（本波顺手修第 3 波遗留）；`os_emscripten.cpp:55` — `runtime/statSampler.hpp` 不存在。
- **修法**：合体为 25 的 `os::current_stack_base_and_size(address*, size_t*)`（os_cpu 层）；mincore_vec_t 改条件编译；删 statSampler.hpp include（StatSampler 已在 24 被移除）。

## 第 5 波：threadCritical.hpp

- **错误**：`os_emscripten.cpp:56` — `'runtime/threadCritical.hpp' file not found`。
- **修法**：删 include（ThreadCritical 已由 C++ std 基元替代）。

## 第 6 波：memTracker.hpp 搬家

- **错误**：`os_emscripten.cpp` — `services/memTracker.hpp` 不存在。
- **修法**：改 `#include "nmt/memTracker.hpp"`（25 把 NMT 头文件移入 nmt/）。

## 第 7 波：os_emscripten.cpp 一批 21 时代 os:: 签名（11 错）

- **错误**：①4 处 `log_info(...)` 用 `UINTX_FORMAT` → expected ')'（25 已删除 `UINTX_FORMAT`/`SIZE_FORMAT` 宏）；②`warn_fail_commit_memory` 的 `INTPTR_FORMAT/SIZE_FORMAT`；③`os::pd_free_memory`、`os::scan_pages`、`os::can_execute_large_page_memory`、`os::pd_remap_memory` out-of-line 定义在 25 的 `os` 中已不存在；④`numa_get_leaf_groups(int*)` → 25 已改 `uint*`；⑤`pd_remap_memory` 内调 `os::map_memory` 现在要求 `MemTag` 参数。
- **修法**：4 处日志格式改 25 的 `%zu`（对照 os_linux.cpp 25 版同位置）；`warn_fail_commit_memory` 改 `PTR_FORMAT/%zu/p2i`；`pd_free_memory` → 改名 `pd_disclaim_memory`（25 上移到该 API 且语义同 madvise(DONTNEED)）；`numa_get_leaf_groups` 参数 `int*→uint*`；删除 `scan_pages`/`can_execute_large_page_memory`/`pd_remap_memory`（25 已移除这三个 pd_/工具接口）。
- **结果**：os/emscripten 目录编译单元全部清零。

## 第 8 波：vmStructs 宏臂（VM_LONG_CONSTANTS_OS）

- **错误**：`share/runtime/vmStructs.cpp:1958` — `VM_LONG_CONSTANTS_OS` 参数不匹配（我方还是 21 的 5 参版）。
- **修法**：对齐 25 的 2 参签名（对照 vmStructs_linux.hpp）。

## 第 9 波：vmStructs 宏臂（VM_STRUCTS_OS / VM_TYPES_OS）

- **错误**：`vmStructs.cpp:1911` — `VM_TYPES_OS` 同样 8→5 参面。
- **修法**：两个宏对齐 25 签名。
- **结果**：源文件级编译 0 错误，进入链接。

## 第 10 波（最终）：链接期 duplicate symbol —— attach/file/map 统一后的残留

- **错误**：wasm-ld 报 14 个 duplicate symbol：`AttachListener::{dequeue,vm_start,pd_init,check_socket_file,is_init_trigger,init_at_startup,abort,pd_data_dump,pd_detachall}` + `os::{create_binary_file,current_file_offset,seek_to_file_offset,pd_map_memory,pd_unmap_memory}`。
- **成因**：25 把 posix attach 统一到 `os/posix/attachListener_posix.cpp`（linux 的 os/linux/attachListener_linux.cpp 已删），并把上述 5 个文件 IO/mmap 帮助函数上移 `os/posix/os_posix.cpp`；我方 21 移植的两个 per-OS 文件/段落与之重复定义。
- **修法**：删除 `os/emscripten/attachListener_emscripten.cpp` 整文件；从 `os_emscripten.cpp` 删 5 个已上移函数的定义。
- **结果**：`make CONF=emscripten-zero hotspot` 返回 0，`Finished building target 'hotspot' in configuration 'emscripten-zero'`。✅✅✅

## 结论

**探针 Z-B 通过**：hotspot 目标已完整通过 25 的编译+归档，全程 10 波收敛、单调减少未反扑，未触发"错误变多变杂→停工"条件。剩余线路（PROXY 侧）：jdk native 库静态构建、`static-libs-image` 产物形态对账、链接 wasm 成品的 static-symbols 管线——均为 make/native 层问题，不再是 hotspot 语义适配。
