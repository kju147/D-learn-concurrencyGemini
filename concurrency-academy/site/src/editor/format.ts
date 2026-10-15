// 最简 Java 整理：按 {} 深度重排缩进（不解析 AST，教学代码粒度足够安全）
// 约定：4 空格缩进；行内存在 {} 的对齐花括号；sameline '{' 保持贴。
export function formatJavaCode(src: string, indentUnit = '    '): string {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let depth = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { out.push(''); continue; }
    // 开括号计数（剔除字符串/注释里的花括号，避免误判；教学代码够用）
    const code = line.replace(/"(?:\\.|[^"\\])*"/g, '""').replace(/\/\/.*$/, '');
    const net = (code.match(/\{/g)?.length ?? 0) - (code.match(/\}/g)?.length ?? 0);
    const closesFirst = code.startsWith('}') ? 1 : 0;
    const d = Math.max(0, depth - closesFirst);
    out.push(indentUnit.repeat(d) + line);
    depth = Math.max(0, depth + net);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}
