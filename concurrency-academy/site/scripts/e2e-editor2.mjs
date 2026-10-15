import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://127.0.0.1:4321/demo/level1?step=judge', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
const editor = page.locator('.monaco-editor');
await editor.waitFor();
await editor.locator('textarea').focus();
await page.keyboard.press('End');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
for (const ch of 'Thread.') { await page.keyboard.type(ch); await page.waitForTimeout(120); }
await page.waitForTimeout(800);
const lines = await page.locator('.monaco-editor .view-lines').textContent();
console.log('editor content tail:', lines.slice(-80));
console.log('suggest rows:', (await page.locator('.suggest-widget .monaco-list-row').allTextContents()).slice(0, 6));
await page.screenshot({ path: 'D:/learn/concurrencykimi/tmp/editor-typed.png' });
await browser.close();
