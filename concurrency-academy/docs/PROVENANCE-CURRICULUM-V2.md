# 课程 v2 基线说明书

> 2026-10-09：外部分析服务交付了一套以 JDK 25 为主线、按"能力阶段 S1–S6"与"知识点证据类型"组织的课程结构（JSON + 设计文档）。经评审，**采纳为本课程的第二版基线**，与第一版 `docs/CURRICULUM-MAP.md` 并存，v2 的分层结构与验收字段优先；逐课内容与关卡细节以我方生产线为准。

## 采纳清单

| 采纳物 | 文件位置 |
|---|---|
| 课程结构 JSON（14 模块 × 155 知识点 × evidence/origins） | `curriculum/curriculum-v2.json`（当前只保留了政策与 runtimePolicy 层；**全量 155 知识点明细请以你持有/对方出口的原始文件另行落盘为 `curriculum/curriculum-v2-full.json`**，我这边没有拿到原文字节） |
| 设计文档（能力阶段 S1–S6、六专题、Windows 首批计划说明） | `curriculum/CURRICULUM-V2-DESIGN.md` |
| 版本政策：内容基线 JDK 25；浏览器判题运行时为 JDK 21 保留作证 | 落地到 `site/src/content/config.ts` 的 schema 扩展 |

##呆滞事项（需要对方补齐资料才能完全吸收的）

- `LEARNING-EXPERIENCE-DESIGN.md`（学习体验设计细节）
- `FIRST-DELIVERY-PLAN.md`（首批计划）
- `lessons/m02-reservation-studio.md` 与 `lessons/m02-stock-invariant.md`（课组脚本与实验合同）
- `coverage-ledger.json` 与 `learning-design.json`（JSON 中被引用但未附上）

## 我方明确保留否决权的三处

1. 课程质量验收门禁以我方 `TEACHING-DESIGN.md` + `validate:lesson` 为准（对方结构是骨架，不是验收标准）。
2. JavaBox WASM 判题启用等待classpath（即浏览器真 JDK 判题）不因对齐 25 而降低——M10/M04 调 preview API 的地方在运行时项不能跑通前，不改变课程路由的方针。
3. 内容案例最终情景化由我方产出（它的业务化案例清单是起点参考）。
