// 关卡流 e2e：钩子 → 剧场 → 对照组 → 收拢 → 判题 → 终点
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(240000);
const shot = (n) => page.screenshot({ path: `D:/learn/concurrencykimi/tmp/level-${n}.png` });

await page.goto('http://127.0.0.1:4321/demo/level1', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await shot('1-hook');

// 下一关应被锁
const nextBtn = page.getByRole('button', { name: /下一关|完成本关解锁/ });
console.log('hook 关 → 下一关按钮:', (await nextBtn.textContent())?.trim());

await page.getByRole('button', { name: /我看完了/ }).click();
await page.getByRole('button', { name: /下一关/ }).click();
await page.waitForTimeout(800);

// 剧场：放映到底（可能经过关卡暂停——若出现则回答后继续）
await page.getByRole('button', { name: /放映/ }).click();
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(1500);
  if (await page.locator('text=关卡暂停').count()) {
    await page.locator('button', { hasText: '有一次算白干了' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /继续放映/ }).click();
  }
  if (await page.locator('text=已看到结局').count()) break;
}
await shot('2-theater-done');
await page.getByRole('button', { name: /下一关/ }).click();

// 对照组放映到底
await page.getByRole('button', { name: /放映/ }).click();
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(1500);
  if (await page.locator('text=已看到结局').count()) break;
}
await shot('3-guarded-done');
await page.getByRole('button', { name: /下一关/ }).click();
await shot('4-recap');

await page.getByRole('button', { name: /我看完了/ }).click();
await page.getByRole('button', { name: /下一关/ }).click();
await shot('5-judge-entry');

// 判题：先填修复版直接过（带病版已在此前 e2e 证伪过）
await page.locator('textarea').fill(`public class Counter {
  private int count = 0;
  public void increment() { synchronized (this) { count++; } }
  public int get() { return count; }
}`);
await page.locator('button', { hasText: /启动 JVM 并判题|判题/ }).first().click();
const out = page.getByTestId('judge-out');
for (let i = 0; i < 120; i++) {
  const txt = await out.textContent();
  if (txt.includes('SUMMARY')) break;
  await page.waitForTimeout(1500);
}
console.log('judge out tail:', (await out.textContent()).slice(-120));
await page.waitForTimeout(800);
await shot('6-judge-pass');

// 终点
const next2 = page.getByRole('button', { name: /下一关/ });
await next2.click();
await page.waitForTimeout(600);
await shot('7-done');
console.log('done:', await page.locator('text=本关拿下').count() > 0 ? 'YES' : 'NO');
await browser.close();
