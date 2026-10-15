// 单课验收门禁（TEACHING-DESIGN.md 的可自动化部分）。
// 用法：node scripts/validate-lesson.mjs
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LESSON_DIR = fileURLToPath(new URL('../src/content/lessons/', import.meta.url));
let failures = 0;
let checked = 0;

const CORE_MODULES = new Set(['m02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08']);

function fail(file, msg) {
  failures += 1;
  console.error(`✗ ${file}: ${msg}`);
}

for (const file of await readdir(LESSON_DIR)) {
  if (!file.endsWith('.mdx')) continue;
  checked += 1;
  const raw = await readFile(path.join(LESSON_DIR, file), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) { fail(file, '缺 frontmatter'); continue; }
  const head = fm[1];
  const body = raw.slice(fm[0].length);

  // 结构项（schema 已保证类型，这里检查"教学硬要求"）
  if (!/^outcomes:/m.test(head)) fail(file, '缺学习目标 outcomes');
  if (!/^nonGoals:/m.test(head)) fail(file, '缺边界声明 nonGoals');
  if (!/^simScenes:/m.test(head)) fail(file, '缺至少一个模拟器/动画场景 simScenes');
  const module = head.match(/^module:\s*(\S+)/m)?.[1];

  // 正文项
  if (!/## 本课验收/.test(body)) fail(file, '缺「本课验收」清单');
  if (!/名词速查|TermCard|<Term/.test(body)) fail(file, '缺名词卡');
  if (CORE_MODULES.has(module) && !/^exerciseIds:\s*\[/m.test(head) || (CORE_MODULES.has(module) && /exerciseIds:\s*\[\s*\]/m.test(head))) {
    fail(file, `核心模块 ${module} 必须关联至少一道判题练习 exerciseIds`);
  }
}

console.log(`\nvalidate:lesson 检查 ${checked} 节课，失败 ${failures} 项`);
if (failures > 0) process.exit(1);
console.log('✓ 验收门全部通过');
