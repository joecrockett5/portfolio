// Loads the site in headless Chromium at desktop and phone widths, in both
// themes, and fails on console errors, failed requests, missing local files
// or horizontal overflow.
const { chromium } = require('playwright');

const base = process.argv[2] || 'http://127.0.0.1:3333/';
const runs = [
  ['desktop dark', { width: 1440, height: 900 }, 'dark'],
  ['desktop light', { width: 1440, height: 900 }, 'light'],
  ['phone dark', { width: 390, height: 844 }, 'dark'],
];

(async () => {
  const browser = await chromium.launch();
  let failed = false;

  for (const [name, viewport, colorScheme] of runs) {
    const context = await browser.newContext({ viewport, colorScheme });
    const page = await context.newPage();
    const problems = [];
    page.on('console', (m) => { if (m.type() === 'error') problems.push('console error: ' + m.text()); });
    page.on('pageerror', (e) => problems.push('page error: ' + e));
    page.on('requestfailed', (r) => {
      // media requests are aborted when a video scrolls off screen and pauses
      if (r.resourceType() !== 'media') problems.push('request failed: ' + r.url());
    });
    page.on('response', (r) => { if (r.status() >= 400) problems.push(r.status() + ' ' + r.url()); });

    await page.goto(base, { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    // scroll through the page so reveals, counters and lazy images all run
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 500) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(500);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) problems.push('horizontal overflow of ' + overflow + 'px');

    // every same-origin file the page points at must exist
    const local = await page.evaluate(() => {
      const urls = new Set();
      document.querySelectorAll('[src], [href], [poster]').forEach((el) => {
        for (const attr of ['src', 'href', 'poster']) {
          const v = el.getAttribute(attr);
          if (!v || v.startsWith('#') || v.startsWith('mailto:') || v.startsWith('data:')) continue;
          const u = new URL(v, location.href);
          if (u.origin === location.origin) urls.add(u.href.split('#')[0]);
        }
      });
      return [...urls];
    });
    for (const u of local) {
      const res = await context.request.head(u).catch(() => null);
      if (!res || !res.ok()) problems.push('missing file: ' + u);
    }

    const unique = [...new Set(problems)];
    console.log((unique.length ? 'FAIL ' : 'ok   ') + name + ' (' + local.length + ' local files checked)');
    unique.forEach((p) => console.log('       ' + p));
    if (unique.length) failed = true;
    await context.close();
  }

  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
