// 内容层 schema：平台唯一事实源。所有课/练习/复习卡/词条必须经过这里定义的结构。
import { defineCollection, z } from 'astro:content';

/** 课程集合：每节课一个 .mdx 文件，frontmatter 即验收门数据 */
const lessons = defineCollection({
  type: 'content',
  schema: z.object({
    /** 课内顺序与路由双用，如 m01/lifecycle */
    module: z.string().regex(/^m\d{2}$/),
    order: z.number().int().positive(),
    title: z.string().min(2),
    subtitle: z.string(),
    minutes: z.number().int().min(5).max(120),
    level: z.enum(['基础', '进阶', '高级']),
    /** 先修课 id 列表（curriculum.json 中必须存在） */
    prereqs: z.array(z.string()).default([]),
    /** 本课学习目标（可验证的说法，不写"了解"） */
    outcomes: z.array(z.string()).min(1),
    /** 本课不保证什么（边界声明，教学设计的硬要求） */
    nonGoals: z.array(z.string()).default([]),
    /** 关联判题练习 id（可无，但核心模块强制） */
    exerciseIds: z.array(z.string()).default([]),
    /** 关联复习卡组 id */
    cardSetId: z.string().optional(),
    /** 动画/模拟器场景 key（动画验收门以此为准） */
    simScenes: z.array(z.string()).min(1),
    /** JDK 版本边界：current | historical（历史博物馆专栏） */
    jdkEra: z.enum(['current', 'historical']).default('current'),
    jdkNote: z.string().optional(),
    /** 课程 v2 基线字段：本课覆盖的知识点 id（对应 curriculum/curriculum-v2.json 的 concepts[].id） */
    conceptIds: z.array(z.string()).default([]),
    /** 课程 v2 基线字段：该课的验收证据类型（JCStress / JMH / 故障注入 / 诊断报告…） */
    evidence: z.string().optional(),
    /** 课程 v2 基线字段属来源（notes-main / notes-principles / notes-patterns / notes-applications / examples / modernization / engineering） */
    origins: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

/** 判题练习集合 */
const exercises = defineCollection({
  type: 'data',
  schema: z.object({
    module: z.string().regex(/^m\d{2}$/),
    title: z.string(),
    difficulty: z.enum(['入门', '标准', '困难', '挑战']),
    timeoutSec: z.number().int().min(5).max(300).default(60),
    /** manifest 中声明的线程能力探针需求，供判题器预检 */
    probes: z.array(z.string()).default([]),
    statement: z.string(),
    hints: z.array(z.string()).default([]),
  }),
});

/** SM-2 复习卡集合（每模块一个 data 文件，内含多卡） */
const cards = defineCollection({
  type: 'data',
  schema: z.object({
    module: z.string().regex(/^m\d{2}$/),
    items: z.array(
      z.object({
        id: z.string(),
        front: z.string(),
        back: z.string(),
        lessonId: z.string().optional(),
      }),
    ).min(1),
  }),
});

/** 名词词典 */
const glossary = defineCollection({
  type: 'content',
  schema: z.object({
    term: z.string(),
    pinyin: z.string().optional(),
    /** 一句话版（词典页列表用） */
    concise: z.string(),
    /** 首次出现在哪节课 */
    firstSeenIn: z.string().optional(),
    related: z.array(z.string()).default([]),
  }),
});

/** 关卡制课（LevelFlow）：一步一脚印，全部内容以数据声明 */
const levels = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    module: z.string().regex(/^m\d{2}$/),
    minutes: z.number().int().min(2).max(60),
    level: z.enum(['基础', '进阶', '高级']),
    /** 验收证据（课程基线 evidence 字段） */
    evidence: z.string().optional(),
    /** 知识点 id 列表 */
    conceptIds: z.array(z.string()).default([]),
    steps: z.array(z.discriminatedUnion('kind', [
      z.object({
        kind: z.literal('story'), id: z.string(), title: z.string(),
        body: z.string(), bullets: z.array(z.string()).optional(),
        /** 可选：内嵌自动放映动件（anim registry key，例如 thread-lifecycle） */
        anim: z.string().optional(),
      }),
      z.object({
        kind: z.literal('sim'), id: z.string(), title: z.string(),
        sceneKey: z.string(), hint: z.string().optional(),
      }),
      z.object({
        kind: z.literal('judge'), id: z.string(), title: z.string(),
        packId: z.string(),
      }),
      z.object({
        kind: z.literal('done'), id: z.string(), title: z.string(), body: z.string(),
      }),
    ])).min(2),
  }),
});

export const collections = { lessons, exercises, cards, glossary, levels };
