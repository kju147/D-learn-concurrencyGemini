import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('console', (m) => { const t = m.text(); if (/^\[(suggest|editor)\]/.test(t)) console.log(t.slice(0, 300)); });
await page.goto('http://127.0.0.1:4321/demo/level1?step=judge', { waitUntil: 'networkidle' });
await page.locator('.monaco-editor').waitFor({ timeout: 60000 });
await page.waitForTimeout(6000);

const box = await page.locator('.monaco-editor').first().boundingBox();
// 点进 increment 方法体内空白行附近
await page.mouse.click(box.x + 200, box.y + 160);
await page.waitForTimeout(300);
await page.keyboard.press('Control+Enter'); // 新起一行
await page.waitForTimeout(200);
await page.keyboard.insertText('Thread thread = new Thread();');
await page.waitForTimeout(600);
await page.keyboard.press('Enter');
await page.keyboard.insertText('thread');
await page.waitForTimeout(400);
await page.keyboard.insertText('.');
await page.waitForTimeout(1500); // quickSuggestionsDelay + 触发

const rows = await page.locator('.suggest-widget .monaco-list-row').allTextContents();
console.log('rows:', rows.length);
console.log(rows.slice(0, 10));
await page.screenshot({ path: 'D:/learn/concurrencykimi/tmp/sem-final11.png' });
await browser.close();
