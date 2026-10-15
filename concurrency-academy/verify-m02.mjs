// m02-ticket-sell 判题真机验收：空起始码不过 + synchronized 修掉过
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(240000);
await page.goto('http://127.0.0.1:4321/level/m02-l2-synchronized?step=sell', { waitUntil: 'networkidle' });
await page.waitForTimeout(7000);

const out = page.getByTestId('judge-out');
const waitJudge = async (tag) => {
  const t0 = Date.now();
  for (;;) {
    const txt = await out.textContent();
    if (txt.includes('SUMMARY')) { console.log(tag, '=>', txt.replace(/\s+/g, ' ').slice(-260)); return txt; }
    if (Date.now() - t0 > 200000) { console.log(tag, 'TIMEOUT'); return txt; }
    await page.waitForTimeout(1500);
  }
};

await page.locator('button', { hasText: /启动 JVM 并判题|判题/ }).first().click();
const r1 = await waitJudge('空起始');
console.log('空起始码被判负:', /FAIL|SUMMARY [0-4]\/5/.test(r1) ? '✓' : '✗');

await page.evaluate(() => {
  window.__jce.getModel().setValue([
    'public class Main {',
    '    public static void main(String[] args) throws Exception {',
    '        TicketWindow w = new TicketWindow(10000);',
    '        Thread[] ts = new Thread[8];',
    '        for (int i = 0; i < 8; i++) {',
    '            int j = i;',
    '            ts[i] = new Thread(() -> w.sell(), "窗口-" + j);',
    '        }',
    '        for (Thread t : ts) t.start();',
    '        for (Thread t : ts) t.join();',
    '        System.out.println("总售出: " + w.sold() + " 剩余: " + w.remaining());',
    '    }',
    '}',
    'class TicketWindow {',
    '    private final int total;',
    '    private int tickets;',
    '    TicketWindow(int count) { this.total = count; this.tickets = count; }',
    '    int sold() { return total - tickets; }',
    '    int remaining() { return tickets; }',
    '    void sell() {',
    '        while (true) {',
    '            synchronized (this) {',
    '                if (tickets <= 0) return;',
    '                tickets--;',
    '            }',
    '        }',
    '    }',
    '}',
  ].join('\n'));
});
console.log('按钮当前文案:', await page.locator('button', { hasText: /判题/ }).first().textContent());
await page.locator('button', { hasText: /^判题$/ }).click();
const r2 = await waitJudge('修复版');
console.log('修复版过:', r2.includes('SUMMARY 5/5') ? '✓' : '✗');
await browser.close();
