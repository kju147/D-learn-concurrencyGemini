import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(240000);
await page.goto('http://127.0.0.1:4321/level/m01-l1-first-thread?step=start-judge', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);

const out = page.getByTestId('judge-out');
const waitJudge = async (tag, ms) => {
  const t0 = Date.now();
  for (;;) {
    const txt = await out.textContent();
    if (txt.includes('SUMMARY') || /超时|错误|尚未就绪/.test(txt)) {
      console.log(tag, '=>', txt.replace(/\s+/g, ' ').slice(-260));
      return txt;
    }
    if (Date.now() - t0 > ms) { console.log(tag, 'TIMEOUT'); return txt; }
    await page.waitForTimeout(1500);
  }
};

// ① 空提交（不改起始码）—— 必须不过
await page.locator('button', { hasText: /启动 JVM 并判题|判题/ }).first().click();
const r1 = await waitJudge('空提交', 240000);
console.log('① 空提交正确判负:', r1.includes('SUMMARY 0/2') || /FAIL/.test(r1) ? '✓' : '✗ 意外');

// ② 修复版 —— 必须全绿
await page.evaluate(() => {
  const code = [
    'public class Main {',
    '    public static void work() {',
    '        System.out.println("[work] 我在线程：" + Thread.currentThread().getName());',
    '    }',
    '    public static void main(String[] args) throws Exception {',
    '        Thread t = new Thread(() -> work(), "worker");',
    '        t.start();',
    '        t.join();',
    '    }',
    '}',
  ].join('\n');
  window.__jce.getModel().setValue(code);
});
await page.locator('button', { hasText: /^判题$/ }).click();
const r2 = await waitJudge('修复版', 180000);
console.log('② 修复版全绿:', r2.includes('SUMMARY 2/2') ? '✓' : '✗ 意外');
await browser.close();
