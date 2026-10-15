import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto('http://127.0.0.1:4321/demo/level1?step=judge', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
const ed = page.locator('.monaco-editor').first();
await ed.click({ position: { x: 200, y: 120 } });
await page.waitForTimeout(500);
await ed.click({ position: { x: 200, y: 120 } });
await page.waitForTimeout(300);
console.log('activeElement:', await page.evaluate(() => document.activeElement?.className));

// 敲一个可见字符验证输入管线
await page.keyboard.press('KeyT');
await page.waitForTimeout(300);
console.log('after T tail:', (await page.locator('.view-lines').first().textContent()).slice(-70));

// EditContext 的 insertText
await page.keyboard.insertText('hread.');
await page.waitForTimeout(900);
console.log('after Thread. tail:', (await page.locator('.view-lines').first().textContent()).slice(-70));
console.log('widget?', await page.evaluate(() => {
  const w = [...document.querySelectorAll('*')].filter((e) => /suggest/.test(e.className?.toString?.() ?? ''));
  return w.map((e) => e.className).slice(0, 5);
}));
await page.screenshot({ path: 'D:/learn/concurrencykimi/tmp/editor-suggest3.png' });
await browser.close();
