import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto('http://127.0.0.1:4321/demo/level1?step=judge', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);

// 量几何：Monaco 内部根是否还有数 px 高的问题
const geo = await page.evaluate(() => {
  const m = document.querySelector('.monaco-editor');
  const r = m.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y) };
});
console.log('monaco rect:', JSON.stringify(geo));

await page.locator('.monaco-editor').first().click({ position: { x: 200, y: 60 } });
await page.waitForTimeout(400);
console.log('focus:', await page.evaluate(() => document.activeElement?.className));
await page.keyboard.insertText('/*XYZ*/');
await page.waitForTimeout(400);
const txt = await page.locator('.monaco-editor .view-lines').first().textContent();
console.log('content tail:', txt.slice(-60));
await page.screenshot({ path: 'D:/learn/concurrencykimi/tmp/editor-geo.png' });
await browser.close();
