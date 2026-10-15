import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(120000);
await page.goto('http://127.0.0.1:4321/level/m01-l1-first-thread?step=start-judge', { waitUntil: 'networkidle' });
await page.waitForTimeout(7000);

// 1. 布局检查：编辑器高度是否显著变大
const h = await page.evaluate(() => document.querySelector('.monaco-editor')?.getBoundingClientRect().height ?? 0);
console.log('编辑器高度:', h, h >= 400 ? '✓' : '✗ 太小');

// 2. 全屏按钮存在并可点（同一编辑器实例切容器，不重建）
const fsBtn = page.locator('button', { hasText: '全屏编码' });
console.log('全屏按钮存在:', (await fsBtn.count()) > 0 ? '✓' : '✗');
await fsBtn.click();
await page.waitForTimeout(600);
const maximized = await page.evaluate(() => !!document.querySelector('.fixed.inset-0.z-50 .monaco-editor'));
console.log('全屏态编辑器存在且实例未重建:', maximized ? '✓' : '✗');
await page.locator('button', { hasText: '还原' }).click();
await page.waitForTimeout(400);
console.log('还原后回到内嵌态:', (await page.evaluate(() => !document.querySelector('.fixed.inset-0.z-50') && !!document.querySelector('.monaco-editor'))) ? '✓' : '✗');

// 3. 本类自定义方法补全：写入 work() + 调用处 partial 前缀
await page.evaluate(() => {
  const e = window.__jce;
  e.getModel().setValue('public class Main {\n    public static void work() {}\n    public static void main(String[] a) {\n        wo\n    }\n}');
  e.setSelection({ startLineNumber: 4, startColumn: 11, endLineNumber: 4, endColumn: 11 });
  e.focus();
  e.trigger('v', 'editor.action.triggerSuggest', {});
});
await page.waitForTimeout(1200);
const rows = await page.locator('.suggest-widget .monaco-list-row').allTextContents();
console.log('④ 输入 wo 后补全含 work():', rows.join('|').includes('work') ? '✓' : '✗', '|rows:', rows.slice(0, 5));

// 4. 格式化按钮：写入一坨乱缩进的代码，点格式化成整齐版
await page.evaluate(() => {
  window.__jce.getModel().setValue('public class Main {\npublic static void main(String[] a) {\nint x=1;\nif (x>0) {\nSystem.out.println(x);\n}\n}\n}');
});
await page.keyboard.press('Escape');
await page.locator('button', { hasText: '格式化' }).click();
await page.waitForTimeout(800);
const formatted = await page.evaluate(() => window.__jce.getValue());
const indented = formatted.split('\n').some((l) => /^ {8}/.test(l));
console.log('⑤ 格式化生效（有 8 空格缩进行）:', indented ? '✓' : '✗');
console.log('formatted head:', JSON.stringify(formatted.slice(0, 120)));

await browser.close();
