# Java 并发编程学习系统 — 总体实施方案

> 状态：待评审（2026-09 批次）
> 上游约束：课程设计以 `docs/CURRICULUM-MAP.md` 为准；本文只决定“怎么把它建出来、部署到哪、如何验收”。
> 已确认的三个决策：**Java 在浏览器 WASM 内执行**（JavaBox Direct 路线）、**部署 Cloudflare Pages/Workers**、**先出方案后施工**。

## 0. 目标与非目标

**目标**：一个从 0 到精通的 Java 并发学习系统——教学（动画/名词/生动例子）、练习（真实编译运行、自动判题）、温故（间隔复习卡）、实战（真实业务与集大成项目 FlashFlow），内容基线 JDK 21，面向初/中/高三个层次共用同一张知识图。公开、免费、可分享。

**非目标**：
- 不做证书、防作弊、对抗性评分；
- 不做远程判题沙箱服务（浏览器 WASM 已满足安全模型；JMH/JCStress 等性能类证据降级为“可下载本地套件 + 站内预录实验结果与解读”）；
- 不重写课程范围——CURRICULUM-MAP 已定 14 模块，本文不改动其内容结构。

## 1. 总体架构

```
┌─ Cloudflare Pages/Workers（唯一入口，静态 + 轻 API）─────────────┐
│  concurrency-academy (vinext + React 19 + shadcn/tailwind)       │
│  ├─ 课程内核：curriculum.json(知识图) → lesson 数据(MD/JSON)       │
│  ├─ 学习功能：诊断 / 课程 / 实验 / 复习(SM-2) / 词典 / 进度(localStorage)│
│  ├─ 练习运行时：@javabox/sdk(改造) → WASM JDK21(含 pthread)         │
│  │     练习包 = starter.java + 单文件行为测试(TestRunner)           │
│  └─ API 仅保留：健康检查/可选埋点；不承载用户代码                  │
└──────────────────────────────────────────────────────────────────┘
WASM 资产托管：同源 /javabox/ 目录（Cloudflare 静态资产 + COOP/COEP 头）
```

关键约束（来自 javabox-research/AGENTS.md，必须遵守）：
- 站点必须发送 `Cross-Origin-Opener-Policy: same-origin` 与 `Cross-Origin-Embedder-Policy: require-corp`（SharedArrayBuffer 前提）；所有第三方资源需 CORS/corp 兼容，否则被隔离策略拦截。
- Direct WASM 单次约 76MB（~3MB wasm + 数据）。必须做：**懒加载（进入实验页才拉取）+ 分片/CDN 缓存 + 版本化工件事命名**。
- Zero 解释器无 JIT：适合练习题（毫秒级逻辑），**不适合**做性能结论；性能课证据走“预录 JMH/JFR 产物 + 解读交互”。
- Emscripten pthread 已知脆弱点：JVM 内部线程（Finalizer/GC）与复杂多线程启动需实测验收（见里程碑 M-eng-0 的探针）。

## 2. 关键工程风险与拆弹顺序

| 风险 | 影响 | 拆弹动作 | 阶段 |
|---|---|---|---|
| WASM 多线程能力 | 并发课的练习**本质就是多线程**；若 pthread 池只能跑轻线程，判题器瘫痪 | 先做“线程探针套件”：N 线程起停、join、synchronized、wait/notify、CAS、线程池、虚拟线程，逐一记录可用矩阵 | M-eng-0 |
| 每次练习 JVM 启动 3-5s | 练习体验差 | 持久单例 + 后台预热；练习间复用 JVM，靠“隔离判题模式”处理脏状态 | M-eng-1 |
| 死循环/线程爆炸卡死标签页 | 用户体验与安全 | 判题在专用 Worker 作用域执行，超时后整体丢弃并重建 WASM 实例 | M-eng-1 |
| COOP/COEP 与现有第三方依赖冲突 | 站点白屏 | 全站资源审计（字体、图表、图片），全部自托管或加 corp 头 | M-eng-0 |
| 内容量巨大，质量不稳 | 烂尾 | 内容工厂 + 单课验收门（见 §4） | 每一批 |

## 3. 里程碑（工程线）

- **M-eng-0 探针与地基（1–2 周工作量）**
  1. wasm 线程探针矩阵（上图 8 类 API 跑通与否的判定表写入 `docs/WASM-THREADING.md`），据此决定练习判题协议（同 JVM 多任务是 or 每题重启）；
  2. Cloudflare 构建管线：`vinext build` → Pages，`_headers` 注入 COOP/COEP，wasm 资产分片与缓存策略；
  3. 现有 app 清理审计：TypeScript/oxlint 全绿、无用组件裁剪。
  验收：云上 URL 可在实验页完成一次 `start/join` 全判题。
- **M-eng-1 练习平台**：练习包格式 v1（见 §5）、判题 Runner（报告每断言结果、diff、超时分级）、一键下载本地套件、失败重试与草稿持久化。验收：5 道真实 JDK21 题在云站点闭环。
- **M-eng-2 学习闭环**：SM-2 复习引擎、诊断→个性化路线、进度模型与导出导入、名词词典接入课程内浮层。
- **M-eng-3 视效基座**：时间线动画组件库（线程状态机、锁竞争、HB 图、队列），同一组件供所有课复用。
- **M-eng-4 部署运营**：自定义域、Analytics、OG、RSS/更新日志、issue 模板与贡献指南（公开仓库化）。

内容线与工程线并行；M-eng-0 不阻塞 M00 文案生产。

## 4. 内容生产线（每节课的“工厂”）

来源：`并发编程*.pdf`（知识输入）＋ `concurrent/` 168 个示例（择优改造，禁止照搬）＋ 社区权威资料（JEP/JLS/JCStress 样例、Shipilëv 笔记、Doug Lea 文档等，引用必标注）。

每节课产物固定 8 件：
1. `lesson.md`：先修、目标、术语表、“本课不保证什么”；
2. ≥1 个**结果可预测**的动画/时间线（复用 M-eng-3 组件）；
3. 1 个可运行错误样例 + 1 个修复样例；
4. ≥2 道手写题（核心模块），真实编译 + 行为断言，非正则判断；
5. 1 个业务迁移题（写明错误选择的代价）；
6. 3–6 张复习卡（进 SM-2 池）+ 跨模块综合题链接；
7. 高级层附规范来源与版本标签（JDK 8 历史实现明确标“历史”）；
8. 涉及 JMM 给 HB 证明或 JCStress 结果；涉及性能给 JMH/负载证据（预录产物 + 数据解读交互）。

**批次顺序**（与 CURRICULUM-MAP §7 一致）：
- B1：M00 + M01 + JMM 样板升级为标杆课 → 内部试学；
- B2：M02–M04（安全/协作/JMM 闭环）→ **第一次公开内测**；
- B3：M05–M08（锁/AQS/CAS/池化/容器）；
- B4：M09–M10（异步编排、虚拟线程/结构化并发/Scoped Values）；
- B5：M11–M12（测试诊断、Spring 实战）；
- B6：M13 FlashFlow 十阶段成型，作为毕设。

每批改完后跑 `validate:curriculum` + 人工走查单课验收 9 条（CURRICULUM-MAP §6），不通过不发布。

## 5. 练习包格式 v1（浏览器判题的核心契约）

```
public/exercises/<id>/
  manifest.json      { id, moduleId, title, starter, tests, timeoutSec, threadProbe }
  Starter.java       带 TODO 的起始代码
  Tests.java         单文件断言式测试（无 JUnit 依赖）
  README.md          题面、提示、常见错误、一键本地运行说明
```

判题流程（全部浏览器内）：WASM JVM（持久）→ 编译 Starter+Tests → 隔离 ClassLoader 运行 Tests main → 结构化结果（每条断言 pass/fail + 线程名/状态等观测值）→ 超时/崩溃即重建 WASM 实例。进度记 localStorage；可选匿名聚合埋点（题号、通过率、耗时；不上传代码）。

## 6. 部署与运维（Cloudflare）

- 站点：Pages/Workers（现有 wrangler 基础改造）；`_headers` 强制 COOP/COEP + 缓存分级（HTML no-cache、wasm/immutable 长缓存）。
- WASM 资产：`/javabox/<git-sha>/` 不可变路径；首屏不加载，进入练习页后流式拉取并显示进度。
- 免费额度评估：纯静态 + 少量 API 落在免费档；不使用任何需要绑卡的资源。
- 发布门禁：CI 跑 `npm run build`（含 curriculum 校验）+ wasm 冒烟（Playwright 无头：打开实验页跑一题）后才有部署权限。

## 7. 验收（整个系统“做成”的定义）

1. 云上 URL 公开可访问，Lighthouse 性能/无障碍达标；
2. M00–M13 全部模块过 §4 验收门，练习 → 判题 → 复习闭环可用；
3. 初级/中级/高级三条入口各走通一条完整路径（真人试学记录）；
4. FlashFlow 十阶段可运行、含正确性与性能验收报告页；
5. 仓库开源化：README、贡献指南、内容贡献模板、许可（代码 MIT，内容 CC BY-SA 建议——待你确认）。

## 8. 立即开始的 5 件事（确认本方案后）

1. 跑 WASM 线程探针矩阵（决定一切判题设计）；
2. 打通 Cloudflare 构建 + COOP/COEP + wasm 托管的“Hello 并发题”端到端链路；
3. 定练习包 v1 格式并把现有 m01 题迁移为该格式；
4. 产出 B1 批（M00/M01/JMM 标杆）全文内容；
5. 建 `docs/PROGRESS.md` 公开看板，记录每节课验收状态。
