import { readFile } from 'node:fs/promises';

const url = new URL('../app/curriculum.json', import.meta.url);
const curriculum = JSON.parse(await readFile(url, 'utf8'));
const errors = [];
const moduleIds = new Set(
  curriculum.modules.map((courseModule) => courseModule.id),
);
const conceptIds = new Set();
const usedOrigins = new Set();

for (const courseModule of curriculum.modules) {
  if (
    !courseModule.id ||
    !courseModule.title ||
    courseModule.concepts.length === 0
  ) {
    errors.push(`模块 ${courseModule.id || '(missing id)'} 缺少标题或知识点`);
  }
  for (const dependency of courseModule.prerequisites) {
    if (!moduleIds.has(dependency))
      errors.push(`${courseModule.id} 引用了不存在的先修模块 ${dependency}`);
    if (dependency === courseModule.id)
      errors.push(`${courseModule.id} 不能依赖自身`);
  }
  for (const concept of courseModule.concepts) {
    if (conceptIds.has(concept.id))
      errors.push(`知识点 ID 重复：${concept.id}`);
    conceptIds.add(concept.id);
    if (!concept.id.startsWith(`${courseModule.id}.`))
      errors.push(`${concept.id} 未使用模块前缀 ${courseModule.id}.`);
    if (!concept.title || !concept.evidence)
      errors.push(`${concept.id} 缺少标题或验收证据`);
    for (const origin of concept.origins) {
      usedOrigins.add(origin);
      if (!(origin in curriculum.sources))
        errors.push(`${concept.id} 引用了未知来源 ${origin}`);
    }
  }
}

const visiting = new Set();
const visited = new Set();
const moduleById = new Map(
  curriculum.modules.map((courseModule) => [courseModule.id, courseModule]),
);
function visit(id) {
  if (visiting.has(id)) return errors.push(`课程先修关系存在环：${id}`);
  if (visited.has(id)) return;
  visiting.add(id);
  for (const dependency of moduleById.get(id).prerequisites) visit(dependency);
  visiting.delete(id);
  visited.add(id);
}
for (const id of moduleIds) visit(id);

for (const id of [...moduleIds].filter((moduleId) => moduleId !== 'm00')) {
  const planned = curriculum.codeExercisePlan[id];
  if (
    !Number.isInteger(planned) ||
    planned < curriculum.assessmentPolicy.manualCodeMinimumPerCoreModule
  ) {
    errors.push(`${id} 没有满足手写代码题最低数量`);
  }
}

for (const id of Object.keys(curriculum.codeExercisePlan)) {
  if (!moduleIds.has(id)) errors.push(`代码练习计划引用了未知模块：${id}`);
}

for (const source of Object.keys(curriculum.sources)) {
  if (!usedOrigins.has(source))
    errors.push(`来源未被任何知识点引用：${source}`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(
  `课程图谱校验通过：${moduleIds.size} 个模块，${conceptIds.size} 个知识点，${usedOrigins.size} 类来源。`,
);
