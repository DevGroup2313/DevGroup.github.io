// EMPORIUM | Build 1 checks, in Chromium through Playwright.
// node tests/t_build1.js <url of Emporium.html> <folder for pictures>
const pw = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const [URL, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m, d) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (c ? '' : '  ' + JSON.stringify(d === undefined ? '' : d).slice(0, 400))); c ? pass++ : fail++; };
const PW = 'Patties are hot at noon!', PW2 = 'Kafe lakay se kafe lakay 2026';

(async () => {
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = async n => { await p.waitForTimeout(900); await p.screenshot({ path: path.join(OUT, n + '.png') }); };
  const click = async s => { await p.click(s); await p.waitForTimeout(120); };
  const fill = async (s, v) => { await p.fill(s, v); await p.waitForTimeout(40); };
  const text = s => p.$eval(s, n => n.textContent.trim());

  await p.goto(URL); await p.waitForSelector('#setupBegin', { timeout: 15000 });
  ok(await p.evaluate(() => Emporium.BUILD.number) === '1', 'the page says Build 1');
  await shot('01-door-new');

  /* ---------- setup ---------- */
  await click('#setupBegin'); await click('#s1Next');
  await click('#s2Next');
  ok(await text('#setupStore-e') !== '', 'setup refuses an empty store name');
  await fill('#setupStore', 'Kafe Lakay Test'); await fill('#setupOwner', 'Yannie'); await click('#s2Next');
  await fill('#setupPw1', 'short'); await fill('#setupPw2', 'short'); await click('#s3Next');
  ok(await text('#setupPw1-e') !== '', 'setup refuses a password under 10 characters');
  await fill('#setupPw1', PW); await fill('#setupPw2', PW); await click('#s3Next');
  await p.waitForSelector('.master-grid', { timeout: 20000 });
  const groups = await p.$$eval('.master-grid .mg-g', ns => ns.map(n => n.textContent));
  ok(groups.length === 13 && groups.every(g => /^[0-9A-HJKMNP-TV-Z]{4}$/.test(g)), 'the Master Key is shown as 13 groups of 4', groups);
  const master = groups.join('');
  const dbBefore = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('emporium'); q.onsuccess = () => { const db = q.result; const tx = db.transaction('meta'); const g = tx.objectStore('meta').get('vault'); g.onsuccess = () => r(!!g.result); }; }));
  ok(dbBefore === false, 'nothing is written before the Master Key is confirmed');
  await shot('02-master-key');
  await click('#s4Next');
  const labels = await p.$$eval('form .pair label', ns => ns.map(n => n.textContent));
  const nA = +labels[0].match(/\d+/)[0], nB = +labels[1].match(/\d+/)[0];
  await fill('#confirmA', 'ZZZZ'); await fill('#confirmB', groups[nB - 1]); await click('#s5Finish');
  ok(await text('#confirmA-e') !== '', 'a wrong group is refused');
  await fill('#confirmA', groups[nA - 1].toLowerCase()); await click('#s5Finish');
  await p.waitForSelector('.shell', { timeout: 20000 });
  ok(true, 'the store is set up and opens');
  await shot('03-home-first');

  /* ---------- sales tax ---------- */
  await p.evaluate(() => Emporium.ui.go('settings'));
  await click('#taxAdd'); await fill('#taxRate', '7'); await click('#taxSave'); await p.waitForTimeout(300);
  ok((await text('#taxList')).includes('7%'), 'a 7% sales tax is set');

  /* ---------- items ---------- */
  await p.evaluate(() => Emporium.ui.go('inventory'));
  async function addItem(f, another) {
    await click('#addItem'); await p.waitForSelector('#itName');
    await fill('#itName', f.name); if (f.cat) await p.selectOption('#itCat', f.cat);
    await fill('#itPrice', f.price); if (f.cost) await fill('#itCost', f.cost);
    if (f.barcode) await fill('#itBarcode', f.barcode); if (f.opening) await fill('#itOpening', f.opening);
    if (f.reorder) await fill('#itReorder', f.reorder);
    await p.selectOption('#itTax', f.tax ? { index: 1 } : { index: 0 });
    await click('#itSave'); await p.waitForTimeout(400);
  }
  await click('#addItem'); await p.waitForSelector('#itName'); await click('#itSave');
  ok(await text('#itName-e') !== '', 'an item without a name is refused');
  await fill('#itName', 'Test'); await fill('#itPrice', 'abc'); await click('#itSave');
  ok(await text('#itPrice-e') !== '', 'a price that is not an amount is refused');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await addItem({ name: 'Kompa Gold CD', cat: 'music', price: '12.99', cost: '6.50', opening: '10', reorder: '3', tax: true });
  await addItem({ name: 'Cola Champagne', cat: 'drinks', price: '1.75', cost: '0.80', opening: '24', barcode: '0123456789012', reorder: '6', tax: true });
  await addItem({ name: 'Pâté kòde (beef)', cat: 'food', price: '2,50', cost: '1.10', opening: '30', tax: false });
  await addItem({ name: '=HYPERLINK("x")', cat: 'other', price: '1', opening: '1', tax: false });
  const n = await p.$$eval('#invRows tr', r => r.length);
  ok(n === 4, 'four items are in the inventory', n);
  await addItem({ name: 'Duplicate barcode', price: '1', barcode: '0123456789012' });
  ok(await text('#itBarcode-e') !== '', 'a barcode already in use is refused');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);

  const st = () => p.evaluate(() => { const s = Emporium.books.state(); const o = {}; Object.values(s.items).forEach(i => o[i.name] = { stock: i.stock, cost: i.cost, price: i.price }); return o; });
  let s1 = await st();
  ok(s1['Pâté kòde (beef)'].price === 250, 'a price typed with a comma (2,50) is kept as 250 cents', s1['Pâté kòde (beef)']);

  /* ---------- receive and correct ---------- */
  await p.click('#invRows .row-key:has-text("Kompa Gold CD")'); await p.waitForSelector('#itReceive');
  await shot('04-item-card');
  await click('#itReceive'); await fill('#rcQty', '5'); await fill('#rcCost', '7.00');
  ok((await text('#rcPreview')).includes('15'), 'receiving shows the stock to come');
  await click('#rcSave'); await p.waitForTimeout(400);
  s1 = await st();
  ok(s1['Kompa Gold CD'].stock === 15 && s1['Kompa Gold CD'].cost === 667, 'receiving 5 at 7.00 gives 15 in stock at an average cost of 6.67', s1['Kompa Gold CD']);
  await p.click('#invRows .row-key:has-text("Pâté kòde (beef)")'); await p.waitForSelector('#itCorrect'); await click('#itCorrect');
  await fill('#adQty', '2'); await click('#adSave');
  ok(await text('#adReason-e') !== '', 'a correction without a reason is refused');
  await p.selectOption('#adReason', 'damaged'); await click('#adSave'); await p.waitForTimeout(400);
  s1 = await st();
  ok(s1['Pâté kòde (beef)'].stock === 28, 'removing 2 damaged leaves 28', s1['Pâté kòde (beef)']);

  /* ---------- a sale ---------- */
  await p.evaluate(() => Emporium.ui.go('register')); await p.waitForSelector('#regSearch');
  await fill('#regSearch', 'kompa'); await p.waitForTimeout(200); await click('#regResults .product');
  await fill('#regSearch', '0123456789012'); await p.press('#regSearch', 'Enter'); await p.waitForTimeout(200);
  await p.fill('.tline:has-text("Cola") input.qty', '2'); await p.press('.tline:has-text("Cola") input.qty', 'Tab'); await p.waitForTimeout(200);
  await fill('#regSearch', 'pâté'); await p.waitForTimeout(200); await click('#regResults .product');
  ok(await text('#tSubtotal') === '$18.99' && await text('#tTotal') === '$20.14', 'the ticket totals: 18.99 before tax, 20.14 with 7% tax on the taxed lines', [await text('#tSubtotal'), await text('#tTotal')]);
  await shot('05-register');
  await click('#takeCash'); await p.waitForSelector('#cashIn');
  await fill('#cashIn', '20'); ok(await p.$eval('#cashDone', n => n.disabled), 'too little cash cannot complete the sale');
  await fill('#cashIn', '25'); ok((await text('#cashChange')).includes('$4.86'), 'the change to give is 4.86', await text('#cashChange'));
  await shot('06-cash');
  await click('#cashDone'); await p.waitForSelector('.receipt');
  await shot('07-receipt');
  ok((await text('.receipt')).includes('A-000001'), 'the receipt is numbered A-000001');
  await click('#receiptDone');
  s1 = await st();
  ok(s1['Kompa Gold CD'].stock === 14 && s1['Cola Champagne'].stock === 22 && s1['Pâté kòde (beef)'].stock === 27, 'the sale takes the stock down (14, 22, 27)', s1);

  /* ---------- reports ---------- */
  await p.evaluate(() => Emporium.ui.go('reports')); await p.waitForSelector('#rProfit');
  const rv = async id => (await text('#' + id + ' .stat-value'));
  ok(await rv('rSales') === '1' && await rv('rNet') === '$18.99' && await rv('rTax') === '$1.15' && await rv('rGross') === '$20.14', 'the day\'s report: 1 sale, 18.99 net, 1.15 tax, 20.14 taken',
    [await rv('rSales'), await rv('rNet'), await rv('rTax'), await rv('rGross')]);
  ok(await rv('rCogs') === '$9.37' && await rv('rProfit') === '$9.62', 'cost of goods 9.37 and gross profit 9.62', [await rv('rCogs'), await rv('rProfit')]);
  ok((await text('#repOut')).includes('$2.20'), 'the losses show 2.20 of damaged stock');
  await shot('08-report');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#repCsv')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  ok(csv.split('\r\n')[0].includes('receipt,date,time') && csv.includes('Kompa Gold CD') && csv.includes('6.67'), 'the sales lines CSV holds the sale with its cost', csv.slice(0, 300));
  const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('#repCsvStock')]);
  const csv2 = fs.readFileSync(await dl2.path(), 'utf8');
  ok(csv2.includes("'=HYPERLINK") && !/\n=HYPERLINK/.test(csv2), 'a name that looks like a formula is written as text in the CSV');

  /* ---------- sealed: nothing readable in the database ---------- */
  const raw = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('emporium'); q.onsuccess = () => { const db = q.result, out = []; const tx = db.transaction(['rec', 'journal']);
    ['rec', 'journal'].forEach(n => { const c = tx.objectStore(n).openCursor(); c.onsuccess = () => { const k = c.result; if (k) { out.push(Array.from(k.value.ct).map(x => String.fromCharCode(x)).join('')); k.continue(); } }; });
    tx.oncomplete = () => r(out.join('\n')); }; }));
  ok(raw.length > 1000 && !/Kompa|Champagne|Yannie|Kafe Lakay|1299|HYPERLINK/.test(raw), 'the records and the ledger hold no readable name or price');

  /* ---------- verify, lock, sign in ---------- */
  await p.evaluate(() => Emporium.ui.go('settings')); await click('#verifyKey'); await p.waitForSelector('#verifyResult');
  ok(await p.$eval('#verifyResult', n => n.dataset.ok) === '1', 'Verify the books: every line and every stock figure agree', await text('#verifyResult'));
  await p.evaluate(() => Emporium.ui.toast('Kompa Gold CD: a message from before the lock', 'good'));
  await p.evaluate(() => Emporium.books.lock('hand')); await p.waitForSelector('#doorPassword');
  ok(await p.$$eval('#toasts > *', n => n.length) === 0, 'locking clears every message that was on the screen');
  await shot('09-door-locked');
  await fill('#doorPassword', 'not the password'); await click('#doorOpen'); await p.waitForTimeout(2500);
  ok(await text('#doorPassword-e') !== '' && !(await p.$('.shell')), 'a wrong password does not open the store');
  await fill('#doorPassword', PW); await click('#doorOpen'); await p.waitForSelector('.shell', { timeout: 20000 });
  ok((await st())['Kompa Gold CD'].stock === 14, 'the right password opens the same books');

  /* ---------- the idle lock ---------- */
  await p.evaluate(() => { Emporium.settings.lockMinutes = 0.001; });
  await p.waitForSelector('#doorPassword', { timeout: 15000 });
  ok((await text('.door-msg')).length > 0, 'the store locks itself when idle and says so');
  await fill('#doorPassword', PW); await click('#doorOpen'); await p.waitForSelector('.shell', { timeout: 20000 });

  /* ---------- the Master Key ---------- */
  await p.evaluate(() => Emporium.books.lock('hand')); await p.waitForSelector('#doorPassword');
  await p.click('text=' + await p.evaluate(() => Emporium.t('door.useMaster')));
  await fill('#masterIn', master.slice(0, 51) + (master[51] === '0' ? '2' : '0')); await click('#masterCheck'); await p.waitForTimeout(400);
  ok(await text('#masterIn-e') !== '', 'a mistyped Master Key is caught by its checksum');
  await fill('#masterIn', groups.join(' - ').toLowerCase()); await click('#masterCheck');
  await p.waitForSelector('#newPw1', { timeout: 15000 });
  await fill('#newPw1', PW2); await fill('#newPw2', PW2); await click('#newPwSave');
  await p.waitForSelector('.shell', { timeout: 20000 });
  ok(true, 'the Master Key opens the store and sets a new password');
  await p.evaluate(() => Emporium.books.lock('hand')); await p.waitForSelector('#doorPassword');
  await fill('#doorPassword', PW); await click('#doorOpen'); await p.waitForTimeout(2500);
  ok(!(await p.$('.shell')), 'the old password no longer opens the store');
  await fill('#doorPassword', PW2); await click('#doorOpen'); await p.waitForSelector('.shell', { timeout: 20000 });
  ok(true, 'the new password opens the store');

  /* ---------- backup, erase, restore ---------- */
  await p.evaluate(() => Emporium.ui.go('settings'));
  const [bk] = await Promise.all([p.waitForEvent('download'), p.click('#saveBackup')]);
  const bkPath = path.join(OUT, 'backup.emporium'); await bk.saveAs(bkPath);
  const bkText = fs.readFileSync(bkPath, 'utf8');
  ok(bkText.includes('"format":"emporium-backup"') && !/Kompa|Champagne/.test(bkText), 'the backup file is sealed (no readable names)');
  await click('#eraseKey'); await fill('#erPw', PW2); await fill('#erName', 'wrong name'); await click('#erGo');
  ok(await text('#erName-e') !== '', 'erasing asks for the store\'s exact name');
  await fill('#erName', 'Kafe Lakay Test'); await click('#erGo');
  await p.waitForSelector('#setupBegin', { timeout: 15000 });
  ok(true, 'the store is erased from this device and the door offers a new setup');
  await p.click('text=' + await p.evaluate(() => Emporium.t('door.restoreHere')));
  await p.setInputFiles('#restoreFile', bkPath); await p.waitForSelector('#restoreSecret');
  await fill('#restoreSecret', 'wrong password!'); await click('#restoreGo'); await p.waitForTimeout(2500);
  ok(await text('#restoreSecret-e') !== '', 'a wrong password does not restore the backup');
  await fill('#restoreSecret', PW2); await click('#restoreGo'); await p.waitForSelector('.shell', { timeout: 30000 });
  s1 = await st();
  ok(s1['Kompa Gold CD'].stock === 14 && s1['Cola Champagne'].stock === 22, 'the restored books are the same books', s1);
  await p.evaluate(() => Emporium.ui.go('settings')); await click('#verifyKey'); await p.waitForSelector('#verifyResult');
  ok(await p.$eval('#verifyResult', n => n.dataset.ok) === '1', 'the restored books verify');

  /* ---------- tampering is found ---------- */
  await p.evaluate(() => new Promise(r => { const q = indexedDB.open('emporium'); q.onsuccess = () => { const db = q.result; const tx = db.transaction('journal', 'readwrite'); const os = tx.objectStore('journal');
    const g = os.get(3); g.onsuccess = () => { const v = g.result; v.ct[5] ^= 1; os.put(v, 3); }; tx.oncomplete = () => r(); }; }));
  await click('#verifyKey'); await p.waitForTimeout(1500);
  ok(await p.$eval('#verifyResult', n => n.dataset.ok) === '0', 'a changed byte in the ledger is found by Verify the books', await text('#verifyOut'));

  /* ---------- three languages, every room, no missing words ---------- */
  for (const l of ['fr', 'ht', 'en']) {
    await p.evaluate(l => { Emporium.setLang(l); Emporium.ui.shell(); }, l);
    for (const r of ['home', 'register', 'inventory', 'reports', 'guide', 'settings']) { await p.evaluate(r => Emporium.ui.go(r), r); await p.waitForTimeout(150); if (l !== 'en') await shot('10-' + l + '-' + r); }
  }
  const missing = await p.evaluate(() => Object.keys(Emporium.missing));
  ok(missing.length === 0, 'no word is missing in English, French or Kreyòl', missing);
  const dict = await p.evaluate(() => { const d = Emporium.dict, out = []; Object.keys(d.en).forEach(k => { ['fr', 'ht'].forEach(l => { if (!d[l][k]) out.push(l + ':' + k); }); }); return out; });
  ok(dict.length === 0, 'every English phrase has its French and Kreyòl', dict.slice(0, 20));

  /* ---------- layout: no sideways scroll at a counter, a laptop, a tablet and a phone ---------- */
  for (const [w, hgt] of [[1366, 768], [1920, 1080], [1180, 820], [820, 1180], [390, 844]]) {
    await p.setViewportSize({ width: w, height: hgt });
    const bad = [];
    for (const r of ['home', 'register', 'inventory', 'reports', 'guide', 'settings']) {
      await p.evaluate(r => Emporium.ui.go(r), r); await p.waitForTimeout(120);
      const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (o > 1) bad.push(r + ':' + o);
      if (w === 390 || w === 1920) await shot('11-' + w + '-' + r);
    }
    ok(bad.length === 0, 'no sideways scroll at ' + w + 'x' + hgt, bad);
  }
  await p.setViewportSize({ width: 1366, height: 768 });

  /* ---------- the side menu folds to its emojis and unfolds again ---------- */
  await p.evaluate(() => Emporium.ui.go('home'));
  const wide = await p.$eval('.rail', n => n.getBoundingClientRect().width);
  await p.click('.rail-fold'); await p.waitForTimeout(200);
  const narrow = await p.$eval('.rail', n => n.getBoundingClientRect().width);
  const labelsHidden = await p.$$eval('.rail .nav-key .long', ns => ns.every(n => getComputedStyle(n).display === 'none'));
  await shot('13-rail-folded');
  await p.click('.rail-fold'); await p.waitForTimeout(200);
  ok(wide > 200 && narrow < 90 && labelsHidden && (await p.$eval('.rail', n => n.getBoundingClientRect().width)) > 200, 'the side menu folds to its emojis and unfolds again', [wide, narrow, labelsHidden]);

  /* ---------- the phone menu: every short word fits, in every language ---------- */
  await p.setViewportSize({ width: 360, height: 780 });
  const cut = [];
  for (const l of ['en', 'fr', 'ht']) {
    await p.evaluate(l => { Emporium.setLang(l); Emporium.ui.shell(); }, l); await p.waitForTimeout(150);
    cut.push(...await p.$$eval('.nav-key .short', ns => ns.filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent)).then(x => x.map(w => l + ':' + w)));
  }
  ok(cut.length === 0, 'the phone menu shows every word whole at 360 pixels, in English, French and Kreyòl', cut);
  await p.evaluate(() => { Emporium.setLang('en'); Emporium.ui.shell(); });
  await p.setViewportSize({ width: 1366, height: 768 });

  /* ---------- the night ---------- */
  await p.evaluate(() => { Emporium.util.prefSet('theme', 'night'); Emporium.ui.applyLook(); Emporium.ui.go('home'); });
  await shot('12-night-home'); await p.evaluate(() => Emporium.ui.go('register')); await shot('12-night-register');

  ok(errors.length === 0, 'no error in the page', errors.slice(0, 5));
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack || e.message); process.exit(2); });
