// Browser smoke test: start a run, capture, end the timer, buy an upgrade,
// and check the next run gets the extra 5 seconds. Requires Playwright with
// Chromium available (`require('playwright')`). Run after `npm run build`.
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

const PORT = 4179;
const URL = `http://localhost:${PORT}/?test`;
const shots = process.env.SHOTS_DIR;

function assert(cond, msg) {
  if (!cond) throw new Error('FALHOU: ' + msg);
  console.log('ok -', msg);
}

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, '../node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 1500));
  const browser = await chromium.launch();
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(800);

    await page.click('[data-act="start"]');
    await page.waitForTimeout(600);
    let t = await page.evaluate(() => window.__abyss.timeLeft);
    assert(t > 28 && t <= 30, `run começa com ~30s (${t.toFixed(2)})`);

    // try to capture: aim at the easiest visible creature and strike
    const box = await page.locator('#game').boundingBox();
    const k = box.width / 480;
    let caught = 0;
    for (let attempt = 0; attempt < 12 && caught === 0; attempt++) {
      const targets = await page.evaluate(() => window.__abyss.debugVisible());
      const order = ['star', 'boxfish', 'coralCrab', 'orangeFish'];
      const rank = (id) => (order.includes(id) ? order.indexOf(id) : 99);
      targets.sort((a, b) => rank(a.id) - rank(b.id));
      const tg = targets[0];
      if (!tg) { await page.keyboard.down('KeyD'); await page.waitForTimeout(400); await page.keyboard.up('KeyD'); continue; }
      await page.mouse.move(box.x + tg.x * k, box.y + tg.y * k);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(700);
      caught = await page.evaluate(() => window.__abyss.captures.length);
    }
    assert(caught > 0, `capturou pelo menos 1 bicho (${caught})`);
    if (shots) await page.screenshot({ path: `${shots}/smoke-capture.png` });

    // move right: depth must increase
    const d0 = await page.evaluate(() => window.__abyss.maxDepth);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(1500);
    await page.keyboard.up('KeyD');
    const d1 = await page.evaluate(() => window.__abyss.maxDepth);
    assert(d1 > d0, `profundidade aumenta indo para a direita (${d0.toFixed(1)} → ${d1.toFixed(1)} m)`);

    // finish the clock
    await page.evaluate(() => { window.__abyss.timeLeft = 0.3; });
    await page.waitForSelector('.results', { timeout: 3000 });
    const runCoins = await page.evaluate(() => window.__abyss.runCoins);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('abyssclaw.save')));
    assert(saved.coins === runCoins && runCoins > 0, `moedas creditadas uma vez e salvas (${saved.coins})`);
    if (shots) await page.screenshot({ path: `${shots}/smoke-results.png` });

    // skill tree: tap the root node twice (select + buy) and see its children appear
    await page.evaluate(() => { const g = window.__abyss; g.save.coins = Math.max(g.save.coins, 60); g.persist(); });
    await page.click('[data-act="upgrades"]');
    await page.waitForSelector('.node[data-id="core"]');
    const before = await page.locator('.node.available, .node.owned').count();
    await page.click('.node[data-id="core"]');
    await page.click('.node[data-id="core"]');
    const lvl = await page.evaluate(() => window.__abyss.save.upgrades.core);
    assert(lvl === 1, 'comprou o nó raiz da árvore');
    const shown = await page.locator(".node.available, .node.owned").count();
    assert(shown === before + 2, `comprar o nó revelou 2 novos nós (${before} → ${shown})`);
    if (shots) await page.screenshot({ path: `${shots}/smoke-skills.png` });

    await page.click('.panel-head [data-act="start"]');
    await page.waitForTimeout(300);
    t = await page.evaluate(() => window.__abyss.timeLeft);
    assert(t > 34 && t <= 35, `próxima run começa com ~35s (${t.toFixed(2)})`);

    // reload: progress persists
    await page.reload();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => window.__abyss.save);
    assert(after.upgrades.core === 1 && after.totalRuns === 1, 'progresso persiste após recarregar');

    assert(errors.length === 0, `sem erros no console ${errors.join(' | ')}`);
    console.log('\nSMOKE OK');
  } catch (e) {
    console.error(e.message, errors);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.kill();
  }
})();
