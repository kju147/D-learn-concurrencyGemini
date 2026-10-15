// Node 级验收（不依赖 Monaco UI）：
// tree-sitter 解析出变量类型 → 我们的元数据索引给成员补全 → 构造器签名
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const WTSModule = require('../node_modules/web-tree-sitter/tree-sitter.js');
const Parser = WTSModule.default ?? WTSModule;

const dir = dirname(fileURLToPath(import.meta.url));
const pubRoot = join(dir, '..', 'public', 'tree-sitter');
const fs = await import('node:fs');

await Parser.init({
  locateFile: (scriptName) => join(pubRoot, scriptName),
});
// web-tree-sitter 的 Language.load 接受文件路径
const lang = await Parser.Language.load(join(pubRoot, 'java.wasm'));
const parser = new Parser();
parser.setLanguage(lang);

const { collectVariableTypes } = await import('../src/editor/ts-analysis.ts');
const { lookupClass } = await import('../src/editor/jdk-index.ts');

const code = `public class Counter {
    private volatile int count = 0;
    public static void main(String[] a) {
        Thread thread = new Thread();
        ReentrantLock lock = new ReentrantLock();
        thread.
    }
}`;

const vars = collectVariableTypes(code, parser);
console.log('① 变量类型识别:', [...vars.entries()]);
const assertEq = (got, want, msg) => {
  if (got !== want) { console.error('✗', msg, 'got', got, 'want', want); process.exitCode = 1; }
  else console.log('✓', msg);
};
assertEq(vars.get('thread'), 'Thread', 'thread 是 Thread');
assertEq(vars.get('lock'), 'ReentrantLock', 'lock 是 ReentrantLock');
assertEq(vars.get('count'), 'int', 'count 是 int（字段）');

// 成员补全逻辑（与 provider 同款分支）
const meta = lookupClass(vars.get('thread'));
const instanceMembers = meta.members.filter((m) => !m.isStatic).map((m) => m.name);
console.log('② thread. 成员:', instanceMembers.slice(0, 8));
const ok = ['start()', 'join()', 'interrupt()'].every((n) => instanceMembers.includes(n));
console.log(ok ? '✓ start/join/interrupt 都在' : '✗ 缺成员');
if (!ok) process.exitCode = 1;

// 受检异常标注
const joinMem = meta.members.find((m) => m.name === 'join()');
console.log('③ join() throws:', joinMem.throws);
assertEq(joinMem.throws?.[0], 'InterruptedException', 'join 带 throws InterruptedException');

// 构造器签名（new Thread(）
const ctors = meta.constructors.map((c) => c.sig);
console.log('④ Thread 构造器:', ctors);
assertEq(ctors.length, 5, '5 个构造器签名');

// 类名静态成员
const statics = lookupClass('Thread').members.filter((m) => m.isStatic).map((m) => m.name);
console.log('⑤ Thread. 静态:', statics);
assertEq(statics.includes('ofVirtual()'), true, '含 ofVirtual()');
assertEq(statics.includes('sleep(long millis)'), true, '含 sleep');

console.log(process.exitCode ? '\n语义层验收：有失败项' : '\n语义层验收：全绿 ✓');
