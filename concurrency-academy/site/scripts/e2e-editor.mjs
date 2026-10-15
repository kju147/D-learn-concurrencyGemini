// 到判题关 → Monaco 敲 "Thread." 验证课程定制补全 → 提示案例截图
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(300000);
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
// 直接用 ?step=judge 定位到判题关（前面关卡的 e2e 由 e2e-level 覆盖）
await page.goto('http://127.0.0.1:4321/demo/level1?step=judge', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

await page.locator('.monaco-editor').waitFor();
console.log('monaco mounted ✓');

// 在 increment 方法体内敲：Thread.  → 期望出现 ofVirtual()/ofPlatform() 等课程定制补全
// Monaco 0.56 用 EditContext（native-edit-context）：真实路径是点坐标落焦再敲
await page.locator('.monaco-editor').click({ position: { x: 200, y: 200 } });
await page.keyboard.press('Control+End');
await page.keyboard.press('Enter');
await page.keyboard.type('Thread.', { delay: 70 });
await page.waitForTimeout(900);
const items = await page.locator('.suggest-widget.visible .monaco-list-row').allTextContents();
console.log('suggestions:', items.slice(0, 6));
await page.screenshot({ path: 'D:/learn/concurrencykimi/tmp/editor-suggest.png' });

// 选中 ofVirtual() 应插入
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
const line = await page.locator('.monaco-editor .view-line').last().textContent();
console.log('inserted line tail:', line);
await browser.close();
