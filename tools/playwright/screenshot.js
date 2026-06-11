// Screenshot helper for Pi Atrium prototype pages
// Usage: node screenshot.js <page-name> [width] [height]
// Example: node screenshot.js onboarding 1400 900

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PROTOTYPE_DIR = path.resolve(__dirname, '../../design/prototype');
const CONCEPTS_DIR = path.resolve(__dirname, '../../design/concepts');
const OUT_DIR = path.resolve(__dirname, './screenshots');

const PAGES = {
  'hub':          { file: 'index.html',          dir: PROTOTYPE_DIR },
  'onboarding':   { file: 'onboarding.html',     dir: PROTOTYPE_DIR },
  'team-new':     { file: 'team-new.html',       dir: PROTOTYPE_DIR },
  'team-active':  { file: 'team-active.html',    dir: PROTOTYPE_DIR },
  'voice':        { file: 'voice.html',          dir: PROTOTYPE_DIR },
  'settings':     { file: 'settings.html',       dir: PROTOTYPE_DIR },
  'concept-1':    { file: 'concept-1.html',      dir: CONCEPTS_DIR },
  'concept-2':    { file: 'concept-2.html',      dir: CONCEPTS_DIR },
  'concept-3':    { file: 'concept-3.html',      dir: CONCEPTS_DIR },
  'concept-chosen': { file: 'concept-chosen.html', dir: CONCEPTS_DIR },
};

async function main() {
  const pageName = process.argv[2] || 'onboarding';
  const width = parseInt(process.argv[3] || '1400', 10);
  const height = parseInt(process.argv[4] || '1100', 10);

  const page = PAGES[pageName];
  if (!page) {
    console.error(`Unknown page: ${pageName}`);
    console.error(`Available: ${Object.keys(PAGES).join(', ')}`);
    process.exit(1);
  }

  const url = `file:///${path.join(page.dir, page.file).replace(/\\/g, '/')}`;
  console.log(`Opening: ${url}`);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height } });
  const pageObj = await context.newPage();

  // Capture console errors
  const errors = [];
  pageObj.on('pageerror', err => errors.push(`PAGE ERROR: ${err.message}`));
  pageObj.on('console', msg => {
    if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text()}`);
  });

  await pageObj.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  // Small delay for fonts/animations
  await pageObj.waitForTimeout(500);

  const outPath = path.join(OUT_DIR, `${pageName}-${width}x${height}.png`);
  await pageObj.screenshot({ path: outPath, fullPage: false });
  console.log(`Saved: ${outPath}`);

  if (errors.length) {
    console.log('\n--- JS errors ---');
    errors.forEach(e => console.log(e));
  } else {
    console.log('\nNo JS errors.');
  }

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
