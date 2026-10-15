import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)));
page.on('console', (m) => { const t = m.text(); if (/^\[(monaco|suggest|editor)\]/.test(t)) console.log(t.slice(0, 300)); });
await page.goto('http://127.0.0.1:4321/demo/level1?step=judge', { waitUntil: 'networkidle' });
await page.waitForTimeout(7000);

await page.evaluate(() => {
  const e = window.__jce;
  const m = e.getModel();
  m.setValue('public class Demo {\n  void f() {\n    Thread t = new Thread();\n    t.\n  }\n}');
  e.setSelection({ startLineNumber: 4, startColumn: 7, endLineNumber: 4, endColumn: 7 });
  e.focus();
  e.trigger('probe', 'editor.action.triggerSuggest', {});
  console.log('editor dom in document?', document.contains(e.getContainerDomNode()));
});
await page.waitForTimeout(1500);
const widgetHtml = await page.evaluate(() => {
  const w = document.querySelector('.suggest-widget');
  return w ? { cls: w.className, html: w.innerHTML.slice(0, 500) } : 'NO WIDGET IN DOM';
});
console.log('widget:', JSON.stringify(widgetHtml).slice(0, 600));
const rows = await page.locator('.suggest-widget .monaco-list-row').allTextContents();
console.log('t. rows:', rows.slice(0, 12));
console.log('含 setName:', rows.join('|').includes('setName'));
console.log('含 join():', rows.join('|').includes('join()'));
await page.screenshot({ path: 'D:/learn/concurrencykimi/tmp/probe-result.png' });
await browser.close();
