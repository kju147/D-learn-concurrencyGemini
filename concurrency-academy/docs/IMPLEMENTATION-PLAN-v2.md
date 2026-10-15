# IMPLEMENTATION-PLAN v2 —— 平台版

> 状态：已评审通过（与作者当面确认 2026-09 批次复审结论）。
> 上文：v1 见 IMPLEMENTATION-PLAN.md。v2 的核心变化：**定位从"教学系统"升为"Java 社区平台"**，对应三个根改造——信息架构（URL 化）、内容层（数据化）、社区层（评论/贡献/订阅）。
> 不变项：JavaBox 浏览器真实判题、Cloudflare 静态托管、CURRICULUM-MAP.md 的 14 模块课程基线、TEACHING-DESIGN.md 的教学故事线规范。

## 1. 已确认的架构决策（冻结）

| 决策 | 结论 |
|---|---|
| 站点框架 | **迁移到 Astro（Content Collections + React islands）**，现有 JavaBox/判题/动画组件作为 islands 平移 |
| UI 体系 | shadcn/ui + Tailwind 为主，MD3 仅作色板参考；动画引擎自研（见 §3） |
| 动画底座 | **确定性调度模拟器（Deterministic Scheduler Simulator）+ Framer Motion**，见 §3 |
| 笔记例子 | 类比精神保留（小南小女可作彩蛋角色），**主案例全部业务化**（对账/库存/配置中心/缓存/熔断） |
| JDK 8 历史内容（偏向锁、JDK7 死链等） | 降级为 **"历史博物馆"专栏**，标注版本边界；讲透"为什么废弃"作为差异化卖点 |
| 开放沙盒 Playground | **作为平台门面之一独立成页**（/playground），Java 并发版 Go Playground |
| 社区机制 | Giscus（GitHub Discussions 评论）+ 每页"在 GitHub 编辑" + CHANGELOG/RSS + 站内搜索（cmdk） |
| 进度系统 | localStorage 起步 → 导出/导入 JSON；账号同步列入远期 backlog |
| 部署 | Cloudflare Pages；WASM 76MB 资产走 GitHub Release + jsDelivr CDN（或 R2，二期定） |

## 2. 信息架构（URL 蓝图，平台的根）

```
/                        首页（平台门面：课程地图 + Playground 入口 + 动态）
/learn                   课程地图总览（支持初/中/高三条入口视角）
/learn/<module>                  模块页（M00–M13）
/learn/<module>/<lesson>         课页 = 文章 + 嵌交互 islands
/exercise                练习总目录（难度阶梯、按模块筛选）
/exercise/<id>           判题练习页（独立 URL，可分享）
/playground              开放沙盒：自由写并发代码、种子回放（见 §4）
/review                  SM-2 复习中心（今日到期卡）
/diagnostic              入学诊断 → 个性化路线
/glossary                名词词典（每条可锚链）
/glossary/<term>
/project/flashflow       FlashFlow 项目主页（十阶段叙事）
/changelog + /rss.xml    更新日志与订阅
本页讨论区 = Giscus 嵌入；每页右上 "在 GitHub 编辑此文"
```

## 3. 动画引擎 v2 蓝图（替换现有"自动播放 PPT"）

核心：**动画不是画出来的帧，是一个确定性调度器真的在跑。**

```
SchedulerSim（TS 库，packages/sim）
  ├─ ThreadScript：线程 = 指令序列（load/store/cas/lock/wait/notify/park…）
  ├─ Scheduler：按 seed 决定每个时间片选中哪个线程执行哪条指令
  │     同一脚本 + 同一 seed ⇒ 同一事件流（可回放、可分享链接定位事故）
  ├─ EventStream → 时间轴（timestamp × thread × action × 状态）
  └─ MemoryModel 插件位：主存/工作内存视图、锁对象状态、队列状态
应用在 React（Framer Motion 渲染）：
  时间轴 scrubber（可拖）、步进/步退、调速、
  交错分支点让学习者自己点「A 先写 / B 先写」、
  「探索模式」自由操作制造竞态、seed URL 分享复现
组件家族（全部同一引擎换分镜）：
  调度器视图 / 锁状态机 / HB 图交互推演 / 队列压力仪 / 缓存行乒乓(MESI)模拟器
```

验收标准：学习者能在 RaceCounter 场景里**亲手制造一次丢失更新并能发给朋友复现**。

## 4. 内容生产线 v2

每节课仍是固定产物清单（沿用 v1 §4 的 8 件 + 本文验收门禁），组织为 Astro Content：

```
content/lessons/<module>/<lesson>.mdx   frontmatter: 先修/目标/术语/边界/练习 id/复习卡 id
content/exercises/<id>/exercise.json    manifest + Starter.java + Tests.java
content/cards/<module>.json             SM-2 复习卡
content/glossary/<term>.md
```

CI 门禁（必须绿才可发布）：
1. `validate:cursos` —— curriculum.json 引用完整性（课↔练习↔卡↔词典）
2. `validate:lesson` —— 单课验收门自动项：含动画组件引用、含可运行正误样例、含判题练习链接、复习卡 3–6 张
3. wasm 冒烟（Playwright：首页 + 一道判题全闭环）
4. 人工走查 TEACHING-DESIGN 9 条（挂在 PR 模板 checklist）

## 5. 里程碑（替代 v1 的 M-eng 序列）

**P0 地基（先动工，不出新内容）**
1. Astro 迁移：外壳 + 课程地图路由 + 一门课按新信息架构跑通（选 M00 L1 做样板）
2. 内容 schema + frontmatter + validate 门禁 v1
3. Giscus / 编辑链接 / RSS / 搜索骨架 / OG 卡
4. JavaBox WASM 运行时在 Astro 下复用验证（懒加载 + COOP/COEP _headers）
   验收：云上 URL 可打开一门课、读完、做题、评论、分享链接直达同一课页。

**P1 互动基座（质量标签）**
1. SchedulerSim v1（load/store/lock 子集）+ RaceCounter/LostUpdate 两个场景改版
2. /playground 上线（自由沙盒，含 seed 回放链接）
3. 帧组件库补齐（锁状态机、HB 图、队列仪）+ Framer Motion 动效规范
   验收：一位未读文档的同事能不看说明独立制造并发事故并生成分享链接。

**P2 学习闭环**
Sm-2 引擎接入新数据结构 → 诊断→路线 → 进度导入导出。

**P3–P6 内容批次（内容线与上面并行，沿用 v1 B1–B6 顺序）**
- P3 = B1+B2：M00–M04 全量（并发直觉/线程/互斥协作/JMM）→ **第一次公开内测**
- P4 = B3：M05–M08（锁/AQS/CAS/池/容器）+ 历史博物馆专栏（偏向锁、JDK7 死链）
- P5 = B4+B5：M09–M12（异步编排/虚拟线程/测试诊断/Spring 实战）
- P6 = B6：M13 FlashFlow 十阶段 + 毕设验收页

**P7 运营**
自定义域、Analytics（Cloudflare Web Analytics，免费）、README/贡献指南/许可（代码 MIT、内容 CC BY-SA）、issue 模板、第一版发布公告。

## 6. 当前 Exit Criteria（何时算"做起来"）

- 任意课页 URL 可粘贴到微信/知乎打开直达
- 动画 v2 至少 3 个场景达到 §3 验收标准
- Playground 能跑通 demo 贴子式分享
- B2 完成时 ≥50 页课、≥30 道判题、≥120 张复习卡可用
- Lighthouse ≥90（性能/无障碍/SEO）；CI 全绿才允许合并 main

## 7. 立即动工序列（下一步，按序）

1. 起 Astro 新仓骨干（或仓内 `site/` 子目录，先用子目录过渡避免迁移大爆炸）
2. 定义内容 schema + 把 M00 L1 迁移为 `.mdx` 样板课
3. 文件路由 + 课程地图页重做
4. JavaBox 资产管线验证（_headers/懒加载/CDN 方案 A/B 试跑）
5. SchedulerSim 数据结构 spike（0.5 天技术验证）
