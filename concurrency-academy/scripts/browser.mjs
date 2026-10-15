// 复用本机下载的 Chrome 即得『浏览器闭环协助』。不依赖任何 MCP。
// 用法：
//   node scripts/browser.mjs smoke                     → 拉网页看有没有大退
//   node scripts/browser.mjs script <file.mjs>          → 在页面里跑一个函数
//   node scripts/browser.mjs screencap <out.png>        → 截图存储
//   node scripts/browser.mjs repl                       → 手工在页面里敲打纯贴板文字

import { chromium } from 'playwright-core';

const EXE = process.env.DSH_BROWSER_EXE ??
  'C:/Users/69417/AppData/Local/ms-playwright/chromium-1246/chrome-win64/chrome.exe';

const [, , action, arg] = process.argv;
const url = process.env.APP_URL ?? 'http://localhost:3000/';

const browser = await chromium.launch({
  headless: true,
  executablePath: EXE,
});

try {
  const page = await browser.newPage();
  page.on('console', () => {});
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  switch (action) {
    case 'smoke': {
      const text = await page.evaluate(() => document.body.innerText.slice(0, 400));
      console.log('STATUS OK; head of page text:\n' + text);
      break;
    }
    case 'script': {
      const fileUrl = new URL('file:///' + process.cwd().replace(/\\/g, '/') + '/' + arg);
      const fn = (await import(fileUrl.href)).default;
      const out = await page.evaluate((fnStr) => (new Function('return (' + fnStr + ')')())(), String(fn));
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case 'screencap': {
      await page.screenshot({ path: arg });
      console.log('saved to ' + arg);
      break;
    }
    default:
      console.log('unknown action');
  }
} finally {
  await browser.close();
}
