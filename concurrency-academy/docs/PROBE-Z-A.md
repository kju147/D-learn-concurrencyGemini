# 探针 Z（第一段）：configure 全绿 + hotspot 编译首战现状

> 日期：2026-10-13；前置：探针 Y（[PROBE-Y-RESULT.md](PROBE-Y-RESULT.md)）。目标：`jdk-25-ga` 的 hotspot 编译。
> 本件回答"能不能 spawn"（能），下一个洞（拿到"能 compile"前最后一波错）已定位但尚未通透。

## 环境走向（一劳永逸的环境资产，已落地 WSL）

- conda/容器不需要：**Ubuntu WSL 就可工作**
- Boot JDK：Temurin 25.0.4.1 LTS（装在 `/root/java25`）
- Emscripten SDK：3.1.40 钉死（`/root/opt/emsdk`）
- 构建机（build host）编译器：**clang 21**（`apt install clang`），通过 configure 命令行变量传入：`BUILD_CC=clang BUILD_CXX=clang++`
- libffi：复用此前 21 正常构建已验证产物 `/root/javabox/third-party/libffi-emscripten/install`（**不要自己重打**；其三方目录子库里有坑：configure 的 config.sub / multilib 顶层层层坑……用现成产物）

## configure 通过的命令链（实测）

`scripts/probe-z-configure.sh`，核心是：

```
bash configure --with-conf-name=emscripten-zero \
  --openjdk-target=wasm32-unknown-emscripten \
  --with-boot-jdk=$HOME/java25 \
  --with-toolchain-type=clang --with-jvm-variants=zero \
  --with-jvm-features=zero,serialgc \          ← 25 已删 static-build
  --disable-jvm-feature-g1gc --disable-jvm-feature-jfr --disable-jvm-feature-jvmci \
  --disable-jvm-feature-compiler1 --disable-jvm-feature-compiler2 \
  --disable-warnings-as-errors --with-debug-level=release \
  --with-native-debug-symbols=none --disable-precompiled-headers \
  --with-x=no --with-cups=no --with-alsa=no --with-fontconfig=no \
  CC=emcc CXX=em++ AR=emar BUILD_CC=clang BUILD_CXX=clang++ \
  --with-libffi=/root/javabox/third-party/libffi-emscripten/install
```

结果：两个 WARNING 级 + 0 ERROR。`Build performance summary` 打印即视作 configure 通过。WSL `/mnt/d` 交叉编译顺带有一个性能警告（不属于探针逻辑）。

## hotspot 编译目前看到的头一波错（未通）

- `src/hotspot/share/runtime/globals.hpp:2018` —— `RUNTIME_OS_FLAGS` 宏在 25 下的展开面与我方 os 钩子有语义摩擦
- `src/hotspot/share/oops/accessBackend.hpp:41` / `:65` —— `HeapOopType` 名称空间变动（紧邻 JEP 491 相关的 oops/barrier 演化）

> 两组错误正是探针 Y 报告里预警的 "25 在 share 层把 Monitor/Loom 重构后落在 hotspot 编译面上的第一波适配点"。

## 到下一步的姿势（探针 Z-B）

1. 对 `globals.hpp:2018` 所在的宏臂补 EMSCRIPTEN 分支（25 结构）；对比 `globals_posix.hpp` 的挂载结构照抄。
2. `accessBackend.hpp` 的错误只在 25 中换过 namespace，属于顺着上游改名字/参数即可。
3. 两修复重启 make，下一波错误出现再逐点收敛。**这是流程性收敛，不是范式冲突**——每轮错误都应该比上一轮少，如果出现某轮错误变多/爆炸就说明移植路子断了，那才是探针 Z 的失败信号。

探针 Z 未到能成为"推翻决定"信号的点，目前为止全部是正常范围。
