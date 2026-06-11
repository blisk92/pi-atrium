// Screenshot a single page given a relative path from the project root.
// Usage: node screenshot-one.js <relative-path> [width] [height]
// Example: node screenshot-one.js design/system/examples.html 1200 2400

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const relative = process.argv[2];
if (!relative) {
  console.error('Usage: node screenshot-one.js <relative-path> [width] [height]');
  process.exit(1);
}
const width = parseInt(process.argv[3] || '1400', 10);
const height = parseInt(process.argv[4] || '1100', 10);

const url = 'file:///' + path.join(PROJECT_ROOT, relative).replace(/\\/g, '/');
const outDir = path.resolve(__dirname, './screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outName = relative.replace(/[\/\\]/g, '_').replace(/\.html?$/, '') + `-${width}x${height}.png`;
const outPath = path.join(outDir, outName);

console.log('URL:', url);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGE: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Saved:', outPath);
  console.log('Errors:', errors.length ? errors : 'none');
  await browser.close();
})();
