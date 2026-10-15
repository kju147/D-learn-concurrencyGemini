// 浏览器内 Java AST 分析（tree-sitter-java over WASM）
// 第一期能力：识别「局部变量/字段/方法参数」的类型，供成员补全使用。
// 本模块完全客户端运行，Wasm 文件在 /tree-sitter/ 下。

/* eslint-disable @typescript-eslint/no-explicit-any */

let parser: any = null;
let booting: Promise<any> | null = null;

async function loadTS(): Promise<any> {
  // CJS 包（0.24，module.exports = TreeSitter），动态 import 交给打包器互操作最稳
  const mod: any = await import('web-tree-sitter');
  return mod.default ?? mod;
}

export async function getParser(): Promise<any> {
  if (parser) return parser;
  if (booting) return booting;
  booting = (async () => {
    const P = await loadTS();
    await P.init({
      locateFile: (scriptName: string) => `/tree-sitter/${scriptName}`,
    });
    const p = new P();
    const lang = await P.Language.load('/tree-sitter/java.wasm');
    p.setLanguage(lang);
    parser = p;

    return p;
  })();
  return booting;
}

function typeText(node: any): string | null {
  const t = node.childForFieldName('type');
  if (!t) return null;
  return t.text.replace(/<.*>$/, '').trim();
}

/** 从源码收全部可见变量类型（局部变量 + 字段 + 形参）。纯语法层面。 */
export function collectVariableTypes(source: string, p: any): Map<string, string> {
  const result = new Map<string, string>();
  let tree: any = null;
  try {
    tree = p.parse(source);
  } catch {
    return result;
  }
  if (!tree) return result;

  const walk = (node: any) => {
    if (node.type === 'local_variable_declaration' || node.type === 'field_declaration') {
      const type = typeText(node);
      if (type) {
        for (const child of node.namedChildren) {
          if (child.type === 'variable_declarator') {
            const nameNode = child.childForFieldName('name');
            if (nameNode) result.set(nameNode.text, type);
          }
        }
      }
    }
    if (node.type === 'formal_parameter') {
      const type = typeText(node);
      const name = node.childForFieldName('name');
      if (type && name) result.set(name.text, type);
    }
    for (const c of node.namedChildren) walk(c);
  };
  walk(tree.rootNode);
  tree.delete?.();
  return result;
}
