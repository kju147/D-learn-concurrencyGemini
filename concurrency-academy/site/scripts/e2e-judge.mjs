import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
page.setDefaultTimeout(300000);
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 500)));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)); });

await page.goto('http://127.0.0.1:4321/demo/level1', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500); // 等 islands 水合
const out = page.getByTestId('judge-out');

async function waitJudge(tag, maxMs) {
  const t0 = Date.now();
  for (;;) {
    const txt = (await out.textContent()) ?? '';
    if (/SUMMARY\s+\d+\/\d+/.test(txt) || /执行超时|尚未就绪|错误|dead/i.test(txt)) {
      console.log(`${tag} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      console.log(txt.slice(0, 600));
      return txt;
    }
    if (Date.now() - t0 > maxMs) { console.log(tag, 'TIMEOUT; last=', txt.slice(0, 400)); await page.screenshot({ path: 'D:/learn/concurrencykimi/tmp/judge-stuck.png' }); return ''; }
    await page.waitForTimeout(2000);
  }
}

console.log('run#1 带病起始代码（含 JVM 首次启动）…');
await page.getByTestId('judge-out').waitFor();
await page.locator('button', { hasText: /启动 JVM 并判题/ }).click();
const r1 = await waitJudge('run#1', 280000);
console.log('run#1 verdict:', r1.includes('SUMMARY 0/5') ? '✓ 如预期失败（判题器抓住了丢失更新）' : '✗ 异常');

console.log('run#2 修复版…');
await page.locator('textarea').fill(`public class Counter {
    private int count = 0;
    public void increment() { synchronized (this) { count++; } }
    public int get() { return count; }
}`);
await page.locator('button', { hasText: /^判题$/ }).click();
const r2 = await waitJudge('run#2', 180000);
console.log('run#2 verdict:', r2.includes('SUMMARY 5/5') ? '✓ 修复后全绿' : '✗ 异常');
await page.screenshot({ path: 'D:/learn/concurrencykimi/tmp/lvl1-judge-final.png' });
await browser.close();
console.log('done');
