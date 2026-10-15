import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://127.0.0.1:4321/demo/level1?step=judge', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
const ed = page.locator('.monaco-editor').first();
await ed.click({ position: { x: 200, y: 200 } });
console.log('activeElement after click:', await page.evaluate(() => document.activeElement?.className ?? 'none'));
await page.keyboard.insertText('Thread.');
await page.waitForTimeout(600);
console.log('typed tail:', (await page.locator('.monaco-editor .view-lines').first().textContent()).slice(-40));
console.log('suggest-widget count:', await page.locator('.suggest-widget').count());
console.log('any suggest-ish:', await page.evaluate(() => {
  const els = [...document.querySelectorAll('[class*="suggest"]')];
  return els.map((e) => `${e.className} vis=${e.offsetParent !== null}`).slice(0, 8);
}));
await page.keyboard.press('Control+Space');
await page.waitForTimeout(800);
console.log('after Ctrl+Space rows:', (await page.locator('.suggest-widget .monaco-list-row').allTextContents()).slice(0, 8));
console.log('widget classes:', await page.evaluate(() => {
  const w = document.querySelector('.suggest-widget');
  return w ? w.className : 'none';
}));
await page.screenshot({ path: 'D:/learn/concurrencykimi/tmp/editor-suggest2.png' });
await browser.close();
