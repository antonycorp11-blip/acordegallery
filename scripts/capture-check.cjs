// Real Chromium integration: isolated moving targets, unmodified run/AI/contact code.
// Requires Playwright + Chromium. Starts its own Vite server; never touches a user's save.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

(async () => {
 const port = 4181;
 const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
 let browser;
 try {
  for (let i = 0; i < 100; i++) {
   try { if ((await fetch('http://localhost:' + port)).ok) break; } catch {}
   await new Promise(r => setTimeout(r, 100));
  }
  browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:' + port + '/?test');
  const result = await page.evaluate(async () => {
   const { Creature } = await import('/src/entities/Creature.ts');
   const { SPECIES, SPECIES_BY_ID, VARIANTS } = await import('/src/entities/Species.ts');
   const { CLAWS } = await import('/src/entities/ClawsCatalog.ts');
   const { defaultSave } = await import('/src/core/Save.ts');
   const { treeNodes } = await import('/src/systems/Upgrades.ts');
   const { CONFIG } = await import('/src/config.ts');
   const g = window.__abyss;
   g.stop();
   g.save.settings.muted = true;
   function trial({id, variant='normal', seed=1, touch=false, stage='max', fps=60, claw='scrap'}) {
    g.save = defaultSave();
    g.save.settings.muted = true;
    g.save.ownedClaws = CLAWS.map(c => c.id);
    g.save.equippedClaw = claw;
    const strength = { early: [3,3,0,0], mid: [3,3,5,0], late: [3,3,5,4] }[stage];
    if (stage === 'max') for (const u of treeNodes('main')) g.save.upgrades[u.id] = u.maxLevel;
    else if (strength) {
     ['strength','strength2','strength3','strength4'].forEach((id,i) => g.save.upgrades[id] = strength[i]);
     // Other capture stats available at this stage, without prestige or special claws.
     const bosses = stage === 'early' ? [] : stage === 'mid' ? ['kingCrab'] : ['kingCrab','colossalEel'];
     for (const u of treeNodes('main')) {
      if (u.branch === 'capture' && u.stat !== 'strength' && (!u.requiresBoss || bosses.includes(u.requiresBoss))) g.save.upgrades[u.id] = u.maxLevel;
     }
    }
    g.startRun();
    g.setupWorld(1234,0);
    g.input.touchMode = touch;
    // Only spawning is disabled to avoid unrelated targets intercepting the strike.
    g.spawn.update = () => {};
    g.eventTimer = 99999;
    const x = g.cam.x + g.cam.focusScreenX;
    const c = new Creature(SPECIES_BY_ID[id], variant, x, g.terrain.seabedY(x)-70, seed);
    if (c.onFloor) c.y = g.terrain.seabedY(x)-c.h/2+1;
    g.spawn.creatures = [c];
    g.input.aimX = x-g.cam.x;
    g.input.aimY = c.y-g.cam.y;
    g.tryStrike(g.cam.y + CONFIG.claw.restTipY);
    for (let frame=0;frame<fps*1.5 && c.state!=='CAPTURED';frame++) g.updateRun(1/fps);
    return c.state === 'CAPTURED';
   }
   const rows = [];
   for (const touch of [false,true]) for (const stage of ['base','early','mid','late','max']) {
    for (const [id,variant] of [['ghostFish','normal'],['wanderingEye','normal'],['lanternLeviathan','normal'],['lanternLeviathan','giant']]) {
     let caught = 0;
     for(let seed=1;seed<=100;seed++) if(trial({id,variant,seed,touch,stage})) caught++;
     rows.push({mode:touch?'touch':'mouse',stage,id,variant,caught,attempts:100});
    }
   }
   let attempts=0;
   const failures=[];
   for (const claw of CLAWS) for (const sp of SPECIES) for (const variant of Object.keys(VARIANTS)) {
    for (const touch of [false,true]) for (const fps of [30,60,120]) for(let seed=1;seed<=3;seed++) {
     attempts++;
     if(!trial({id:sp.id,variant,claw:claw.id,touch,fps,seed})) {
      failures.push({id:sp.id,variant,claw:claw.id,touch,fps,seed});
     }
    }
   }
   const { SkillTree } = await import('/src/ui/SkillTree.ts');
   g.save = defaultSave();
   g.save.bosses = ['kingCrab'];
   g.save.coins = 1e9;
   Object.assign(g.save.upgrades, { core:1, strikeSpeed:1, strength:3, strength2:3 });
   g.refreshStats();
   const root = document.createElement('div');
   document.body.append(root);
   const tree = new SkillTree(root,g,()=>{});
   tree.tapNode('strength3');
   const beforeText = root.querySelector('.eff').textContent;
   root.querySelector('[data-buy]').click();
   const afterText = root.querySelector('.eff').textContent;
   const saved = JSON.parse(localStorage.getItem('abyssclaw.save'));
   const ui = { beforeText, afterText, strength:g.stats.strength, purchased:saved.upgrades.strength3 };
   return {rows,attempts,failures,ui};
  });
  console.table(result.rows);
  console.log('Full main tree: ' + result.attempts + ' browser capture attempts, failures: ' + result.failures.length);
  assert.deepEqual(result.failures, []);
  for (const row of result.rows.filter(r => r.stage === 'max' || r.stage === 'late')) assert.equal(row.caught, 100, JSON.stringify(row));
  for (const row of result.rows.filter(r => r.stage === 'base' && r.id !== 'ghostFish')) assert.equal(row.caught, 0);
  assert.match(result.ui.beforeText, /Força total: 5.40/);
  assert.match(result.ui.beforeText, /Força total: 5.94/);
  assert.match(result.ui.afterText, /Força total: 5.94/);
  assert.ok(Math.abs(result.ui.strength - 5.94) < 1e-10);
  assert.equal(result.ui.purchased, 1);
  console.log('Skill tree purchase: 5.40 -> 5.94, preview matches runtime and persisted save');
  assert.deepEqual(errors, []);
  console.log('CAPTURE PROGRESSION OK');
 } finally {
  if(browser) await browser.close();
  server.kill();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
