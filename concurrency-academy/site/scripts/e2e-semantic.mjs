// 编辑器语义层验收：
// ① 声明 Thread thread = new Thread(...) 后，thread. 给 Thread 实例成员（含 throws 标注）
// ② new Thread( 触发构造器签名提示
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(120000);
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto('http://127.0.0.1:4321/demo/level1?step=judge', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);

const setAndTest = async (code, line, col, action) => await page.evaluate(
  ({ code, line, col, action }) => {
    const e = (window ).__jce;
    e.getModel().setValue(code);
    e.setPosition({ lineNumber: line, column: col });
    e.focus();
    // 等 AST 重建一拍后触发
    return new Promise((resolve) => setTimeout(async () => {
      if (action === 'suggest') e.trigger('test', 'editor.action.triggerSuggest', {});
      else e.trigger('test', 'editor.action.triggerParameterHints', {});
      setTimeout(() => {
        const rows = [...document.querySelectorAll('.suggest-widget .monaco-list-row')].map((r) => r.textContent);
        const hints = [...document.querySelectorAll('.parameter-hints-widget .monaco-scrollable-element, .parameter-hints-widget')].map((r) => r.textContent?.slice(0, 200));
        resolve({ rows, hints });
      }, 900);
    }, 1200));
  },
  { code, line, col, action },
);

// ① 变量成员补全
const code1 = `public class Counter {
    public static void main(String[] a) {
        Thread thread = new Thread();
        thread.
    }
}`;
let r = await setAndTest(code1, 4, 16, 'suggest');
console.log('① thread. 补全（前 8）:', r.rows.slice(0, 8));
const joined = r.rows.join('|');
console.log('   含 join():', joined.includes('join()'), '含 interrupt():', joined.includes('interrupt()'), '含 start():', joined.includes('start()'));
await page.screenshot({ path: 'D:/learn/concurrencykimi/tmp/sem-members.png' });

// ② new Thread( 签名提示
const code2 = `public class Counter {
    public static void main(String[] a) {
        Thread t = new Thread(
    }
}`;
r = await setAndTest(code2, 3, 31, 'hint');
console.log('② 签名提示:', JSON.stringify(r.hints).slice(0, 300));
await page.screenshot({ path: 'D:/learn/concurrencykimi/tmp/sem-hint.png' });

// ③ Thread. 静态补全
const code3 = `public class Counter {
    public static void main(String[] a) {
        Thread.
    }
}`;
r = await setAndTest(code3, 3, 16, 'suggest');
console.log('③ Thread. 静态补全（前 6）:', r.rows.slice(0, 6));
console.log('   含 ofVirtual():', r.rows.join('|').includes('ofVirtual()'), '含 sleep:', r.rows.join('|').includes('sleep'));

await browser.close();
