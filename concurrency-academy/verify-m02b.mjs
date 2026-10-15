import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(240000);
await page.goto('http://127.0.0.1:4321/level/m02-l3-transfer-deadlock?step=transfer', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);

const out = page.getByTestId('judge-out');

// 正确答案：统一按 name 字典序加锁
await page.evaluate(() => {
  window.__jce.getModel().setValue([
    'public class Main {',
    '    public static void main(String[] args) throws Exception {',
    '        Account a = new Account("A", 5000);',
    '        Account b = new Account("B", 5000);',
    '        Thread t1 = new Thread(() -> { for (int i = 0; i < 1000; i++) a.transferTo(b, 1); }, "tAtoB");',
    '        Thread t2 = new Thread(() -> { for (int i = 0; i < 1000; i++) b.transferTo(a, 1); }, "tBtoA");',
    '        t1.start(); t2.start(); t1.join(); t2.join();',
    '        System.out.println("转账完成");',
    '    }',
    '}',
    'class Account {',
    '    final String name; int balance;',
    '    Account(String name, int balance) { this.name = name; this.balance = balance; }',
    '    void transferTo(Account target, int amount) {',
    '        // 所有线程按同一顺序加锁：账号名字典序小的先',
    '        Account first = name.compareTo(target.name) < 0 ? this : target;',
    '        Account second = name.compareTo(target.name) < 0 ? target : this;',
    '        synchronized (first) {',
    '            synchronized (second) {',
    '                if (balance >= amount) { balance -= amount; target.balance += amount; }',
    '            }',
    '        }',
    '    }',
    '}',
  ].join('\n'));
});

await page.locator('button', { hasText: /启动 JVM 并判题|判题/ }).first().click();
for (let i = 0; i < 80; i++) {
  const txt = await out.textContent();
  if (txt.includes('SUMMARY')) { console.log('判题结果:', txt.replace(/\s+/g, ' ').slice(-220)); break; }
  await page.waitForTimeout(2000);
}
await browser.close();
