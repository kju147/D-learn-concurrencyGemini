// 用 Chromium CDP 原生派发按键，验证：敲 thread. 是否弹出实例成员补全
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: 'C:/Users/69417/AppData/Local/ms-playwright/chromium-1246/chrome-win64/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('console', (m) => { const t = m.text(); if (/^\[(editor|suggest)\]|Debug/.test(t)) console.log(t.slice(0, 300)); });
await page.goto('http://127.0.0.1:4321/demo/level1?step=judge', { waitUntil: 'networkidle' });
await page.locator('.monaco-editor').waitFor({ timeout: 60000 });
await page.waitForTimeout(6000);

const cdp = await page.context().newCDPSession(page);

// 用 CDP 原生输入一段真实声明
const typeText = async (text) => {
  await cdp.send('Input.insertText', { text });
};

// 鼠标点进编辑区（排行价：mouse 是 playwright 的都行）
const box = await page.locator('.monaco-editor').first().boundingBox();
await page.mouse.click(box.x + 120, box.y + 170);
await page.waitForTimeout(300);
console.log('debug vars before:', JSON.stringify(await page.evaluate(() => window.__editorDebug?.())));

await typeText('Thread thread = new Thread();\nthread');
await page.waitForTimeout(800);
console.log('debug vars after decl:', JSON.stringify(await page.evaluate(() => window.__editorDebug?.())));
console.log('content tail:', (await page.evaluate(() => window.__jce.getValue().slice(-80))));

await typeText('.');
await page.waitForTimeout(1500);

const widget = await page.evaluate(() => {
  const w = document.querySelector('.suggest-widget');
  return w ? { visible: !w.classList.contains('hidden'), cls: w.className, rowCount: document.querySelectorAll('.suggest-widget .monaco-list-row').length } : null;
});
console.log('suggest widget:', JSON.stringify(widget));
const rows = await page.locator('.suggest-widget .monaco-list-row').allTextContents();
console.log('rows sample:', rows.slice(0, 8));
await page.screenshot({ path: 'D:/learn/concurrencykimi/tmp/cdp-thread.png' });
await browser.close();
