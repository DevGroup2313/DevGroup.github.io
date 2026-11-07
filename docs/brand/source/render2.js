const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch(); fs.mkdirSync('png2', { recursive: true });
  for (const f of fs.readdirSync('pages2').filter(f => f.endsWith('.html'))) {
    const p = await b.newPage({ viewport: { width: 512, height: 512 } });
    await p.goto('file://' + process.cwd() + '/pages2/' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    const name = f.replace('.html', ''); const n = await p.evaluate(() => document.querySelectorAll('svg').length);
    await p.screenshot({ path: `png2/${name}-all.png`, omitBackground: true });
    for (let i = 0; i < n; i++) {
      await p.evaluate(i => document.querySelectorAll('svg').forEach(s => s.style.visibility = s.id === 'L_' + i ? 'visible' : 'hidden'), i);
      await p.screenshot({ path: `png2/${name}-${i}.png`, omitBackground: true });
    }
    await p.close();
  }
  await b.close(); console.log('ok');
})();
