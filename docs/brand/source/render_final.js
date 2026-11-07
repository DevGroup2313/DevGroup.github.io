const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch(); fs.mkdirSync('final', { recursive: true });
  for (const m of (process.argv[2] ? [process.argv[2]] : ['spiral', 'rose', 'hibiscus'])) for (const th of ['day', 'night']) {
    const p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 2 });
    await p.goto('file://' + process.cwd() + `/pages2/${m}-${th}.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    const n = await p.evaluate(() => document.querySelectorAll('svg').length);
    await p.screenshot({ path: `final/${m}-${th}-all.png`, omitBackground: true });
    for (let i = 0; i < n; i++) {
      await p.evaluate(i => document.querySelectorAll('svg').forEach(s => s.style.visibility = s.id === 'L_' + i ? 'visible' : 'hidden'), i);
      await p.screenshot({ path: `final/${m}-${th}-${i}.png`, omitBackground: true });
    }
    await p.close();
  }
  await b.close(); console.log('final rendered');
})();
