# 公开进度看板

> 每一行代表"已验收"。规则见 docs/IMPLEMENTATION-PLAN-v2.md §5。
> **当前节奏：双轨推进**——A线=内容生产（JavaBox JDK21 已放行），B线=JavaBox 升 25 的探针任务。

## 两条轨道

| 轨道 | 内容 | 当前桩子 |
|---|---|---|
| A 线：内容生产 | 按课程 v2 基线路径铺课（概念清单 + evidence 验收） | 下一步：M00 全量 / M01 线程基础 |
| B 线：JavaBox×25 | 探针 Y（合并）→ Z（compile-only+同步压测）→ 成型 | 探针 X 已完成（冲突面实测见 docs/PROBE-X-JDK25.md） |
| ⏸ 暂缓 | 远程仓库/Cloudflare 部署、Giscus、SM-2 | 等 P0 内侧验收后恢复 |

## JavaBox 升级（B 线）— 探针状态

- [x] 探针 X（试合冲突面）✅：我方两新目录零冲突；病灶在 osThread.hpp / NativeCompilation.gmk / UnixNativeDispatcher.c / os_posix.cpp。详见 [docs/PROBE-X-JDK25.md](PROBE-X-JDK25.md)
- [x] 探针 Y（可 configure 的 25 树）✅ [docs/PROBE-Y-RESULT.md](PROBE-Y-RESULT.md)：27 个共享钩子全落位，仅 1 处语义迁移（osThread → osThread_emscripten.hpp）
- [x] 探针 Z-A（configure 通过）✅：WSL 加 emcc 3.1.40 + Temurin 25.boot + 沿用 [探针 Y 的探针 configure]。中间记录：WSL 里要爱 `BUILD_CC=clang` 走命令行变量；`--enable-static-build` 在 25 已删；libffi 直接用既有 21 产物
- [ ] 🟡 探针 Z-B：hotspot compile-only 第一波错误已现身（globals.hpp RUNTIME_OS_FLAGS / accessBackend.hpp 的 HeapOopType——正是探针报告预警的 JEP 491 落点），下一波逐个收敛，详见 [docs/PROBE-Z-A.md](PROBE-Z-A.md)
- [ ] 探针 Z-C：synchronized/wait-notify/虚拟线程最小压测（唯一可能推翻决策的环节，随后）

## 阶段

| 阶段 | 内容 | 状态 |
|---|---|---|
| P0 地基 | Astro 站点骨架 / 内容 schema / 路由 / 验收门禁 | 🟡 进行中 |
| P1 互动基座 | 调度模拟器 v1 + 动画改版 ×3 + Playground | ⬜ 未开始 |
| P2 学习闭环 | SM-2 / 诊断→路线 / 进度导入导出 | ⬜ 未开始 |
| P3 内容批次 B1+B2 | M00–M04 全量 | ⬜ 未开始 |
| P4 批次 B3 | M05–M08 + 历史博物馆 | ⬜ 未开始 |
| P5 批次 B4+B5 | M09–M12 | ⬜ 未开始 |
| P6 批次 B6 | M13 FlashFlow 十阶段 | ⬜ 未开始 |
| P7 运营 | 域名 / Analytics / 开源化发布 | ⬜ 未开始 |

## P0 验收清单

- [x] Astro 项目骨架（`site/`），22 页静态构建通过
- [x] 内容集合 schema（lessons / exercises / cards / glossary）
- [x] 课页 URL 路由 `/learn/<module>/<lesson>`（含目标/边界/历史标签）
- [x] 课程地图页（14 模块实时聚合）
- [x] 首页 / Playground / 判题练习 / 词典 / 诊断 占位页
- [x] RSS + changelog 骨架
- [x] `validate:lesson` 验收门禁（outcomes/nonGoals/simScenes/名词卡/核心模块练习强制）
- [ ] 远程仓库与 Cloudflare Pages 部署
- [ ] Giscus 实接（待开源仓库公开）
- [ ] JavaBox WASM 资产管线（_headers + 懒加载 + CDN）

## 标杆关卡全链路（丢失更新）—— 已打通 ✅

页面：`/demo/level1`（剧场→关卡暂停→接管→收拢→真实判题）。

- [x] 动画精装 v1.1：数据飞行筹码（load/store 时数值在主存↔工作内存间移动）、事件长河（每拍一枚棋子，点任意棋子回放现场）、镜头语言（事故震动+红闪、虚焦）
- [x] **JavaBox 真 JVM 判题接入 Astro**：worker 资产管线（`/javabox/` 同源代理 + COOP/COEP 中间件 + 生产 `_headers`），`JavaJudge` 岛组件
- [x] 判题协议踩坑记录（全部已排雷并写进代码注释）：
  1. Emscripten 嵌套 Worker 禁跨源 → 资产必须同源（dev 用 vite proxy）
  2. dev 响应缺 COOP/COEP → `configureServer` 自定义中间件
  3. `JBOX_FILE` 需裸类名（带 `.java` 会把点号当包分隔）
  4. **学员/判题代码禁用 `System.exit`**（会杀掉整个 CompileServer 循环）；收尾由 `joinAllUserThreads` + JBOX_EXIT 负责，成败靠 `SUMMARY x/y` 判定
- [x] e2e 证据（Playwright 真浏览器）：带病起始码 → `SUMMARY 1/5`（4 轮真丢更新数值）；加 synchronized → `SUMMARY 5/5`；单轮判题 2s、冷启动约 6s（本地资产）
- [x] `site/scripts/e2e-judge.mjs` 固化为正式用例

## P1 提前项：调度模拟器 spike（已完成验证 ✅）

- [x] `site/src/sim/engine.ts` 模拟器核心：指令集（load/add/store/lock/unlock/cas/say）+ 确定性 seed 调度（mulberry32）+ 手工步进（探索模式）
- [x] 场景脚本库 `scenes.ts`：`lost-update`（无锁）+ `lost-update-guarded`（synchronized 对照组）
- [x] React 岛组件 `SimPlayer`（Framer Motion 动效、自动跑/换事故/亲手交错三模式），直出页 `/sim/<scene>`，已内嵌到 /playground
- [x] 验证（Node 直跑引擎）：
  - 手工坏交错无锁 → counter=1（丢失更新浮现）✓
  - 同一坏交错加锁 → counter=2，B 线程正确 BLOCKED ✓
  - 无锁 1000 个 seed → **357 次事故**（"换个事故"真能换出事故）✓
  - 加锁 1000 个 seed → **0 次事故**（互斥语义正确）✓

## A 线：模板与判题包（已完成本轮交付 ✅）

- [x] **关卡模板数据化**：新内容集合 `levels`（zod 鉴权，story/sim/judge/done 四态步骤）。内容生产者现在只写 `src/content/levels/<id>.json`，不碰 React。验收：demo/level1 已改为数据驱动，标题/进度 6 格/判题题面/起始码全部来自数据文件。
- [x] **判题练习包 v1 落地**：`site/public/exercises/<id>/{manifest.json, Starter.java, Tests.java}` 协议；`JavaJudge` 支持 `packId` 懒加载。验收：页面 `/demo/level1` 的判题关从包加载，浏览器实测 200 OK。
- [x] 编辑器关键缺陷修复（承接上轮）：JavaCodeEditor 的 `useEffect` 依赖从 `[exerciseId, hostRef.current]` 改为 `[exerciseId]`——**消除了 LiviFlow 状态变动时编辑器被销毁重建导致的补全消失 bug**。浏览器实测：`Thread t; t.` 弹 12 个实例成员（含 setName/join）。
- [ ] SM-2 复习闭环（判题通过 → 复习卡入池）
- [ ] M00/M01 首批正课按模板量产
- [ ] /exercise 目录页从包索引读取（待建 index.json，避免双数据源）

## 学习体验当前可点击验收

- 关卡制完整课：http://127.0.0.1:4321/demo/level1（数据驱动版）
- 判题直跳：http://127.0.0.1:4321/demo/level1?step=judge
- 编辑器独立探针：http://127.0.0.1:4321/demo/judge-only

## 本轮 M01-M02 的深层排雷

- [x] 判题包 m02-ticket-sell: 死锁窗口扩大（8 线程×10000 票 + 剩余=0 不变量）后带病代码一遇即发，修复版 5/5 过
- [x] m02-transfer-lock-order: 带病代码被 60s 判题超时围住（死锁=判负）；锁序一致解法 SUMMARY 1/1 过。**同行发现**:「ThreadMXBean 在现版本 WASM JVM 未实现」登入收藏案（这类 API 干净做判定别碰）。
- [x] 文案污染清零: m01-l1..l6 与 m00-l1..l4 全部重写干净过 JSON 解析
- [x] Markdown 渲染入课关: 正文支持代码块、行内 code、加粗
- [x] 自动放映动画组件: thread-lifecycle → m01-l2「看一场戏」
- [x] 编辑器: 自定义方法补全 (work() 会出）、格式化按钮、全屏切换、Ctrl+Enter 判题

## 课程验收状态（每节课一行，通过 validate:lesson + 人工走查才打勾）

| 模块 | 课 | 门禁 | 走查 |
|---|---|---|---|
| M00 | 为什么后端工程师绕不开并发（样板课） | ✅ | ⬜ |
| M00 | 六个总被混用的词 | ✅ | ⬜ |
| M00 | 进程与线程 | ✅ | ⬜ |
| M00 | 并发前的宿主环境热身（异常/堆栈） | ✅ | ⬜ |
| M01 | 第一个真正在另一个窗口运行的线程（含判题） | ✅ | ⬜ |

## 判题验收记录（真实浏览器 JVM）

- `m01-start-vs-run` 空起始码 → SUMMARY 1/2（判负 ✓）；修复版（Thread + start + join + 命名） → SUMMARY 2/2 ✓
- `m02-lost-update-counter` 带病 → 4/5 轮真丢更新；加 synchronized → 5/5 ✓

## 四卷笔记精读资产（内容工厂输入）

- [report-原理卷.md](../../notes-extract/report-原理卷.md)（逐节清单 + 11 条准确性修正）
- [report-模式卷.md](../../notes-extract/report-模式卷.md)（9 模式 + 遗漏模式清单）
- [report-应用卷.md](../../notes-extract/report-应用卷.md)（案例评价 + 12 项现代化缺口）
- 主卷由项目负责人亲自通读，要点已并入 CURRICULUM-MAP 对账
