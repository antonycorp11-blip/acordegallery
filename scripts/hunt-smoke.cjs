// v0.2 integration of the actual game and UI, including predator feeding and tools.
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port','4183','--strictPort'],{stdio:'ignore'});
 let browser;
 try {
  for(let i=0;i<100;i++) { try{if((await fetch('http://localhost:4183')).ok)break;}catch{} await new Promise(r=>setTimeout(r,100)); }
  browser=await chromium.launch({args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4183/?test');
  assert.match(await page.locator('.game-version').textContent(),/v0.2.0/);
  await page.click('[data-act="loreOk"]');
  await page.screenshot({path:'/tmp/hunt-home.png'});
  const results=await page.evaluate(async()=>{
   const {defaultSave}=await import('/src/core/Save.ts');
   const {treeNodes,computeStats}=await import('/src/systems/Upgrades.ts');
   const {BOSSES,Boss}=await import('/src/entities/Boss.ts');
   const {Creature}=await import('/src/entities/Creature.ts');
   const {SPECIES_BY_ID}=await import('/src/entities/Species.ts');
   const {CONFIG,VIEW_W}=await import('/src/config.ts');
   const g=window.__abyss;g.stop();
   const result={};
   function reset(prestiges=0) {
    g.save=defaultSave();g.save.settings.muted=true;g.save.prestiges=prestiges;
    g.save.bosses=BOSSES.map(b=>b.id);
    for(const u of treeNodes('main'))g.save.upgrades[u.id]=u.maxLevel;
    g.startRun();g.setupWorld(1234,1000);g.spawn.creatures=[];g.spawn.update=()=>{};g.eventTimer=99999;
    g.input.touchMode=false;g.input.aimX=VIEW_W/2;g.input.aimY=130;
    return g.cam.x+VIEW_W/2;
   }
   let x=reset();
   result.speed={base:computeStats(defaultSave()).lateralSpeed,max:g.stats.lateralSpeed,duration:g.timeLeft};
   // Food chain: real sinking bait, AI attraction and predator collisions, no forced feeding.
   g.save.selectedBait='chum';g.save.baits.chum=1;g.throwBait();
   for(let i=0;i<12*60;i++) {g.updateRun(1/60);}
   const sharks=g.spawn.creatures.filter(c=>c.def.behavior==='predator');
   result.feeding=sharks.map(c=>({id:c.def.id,meals:c.meals,width:c.w,mult:c.trophyMult}));
   // Sedative changes effective strength while a creature is in the cloud.
   x=reset();const c=new Creature(SPECIES_BY_ID.lanternLeviathan,'giant',x,g.cam.y+130,1);
   g.spawn.creatures=[c];g.save.selectedBait='sedative';g.save.baits.sedative=1;g.throwBait();
   for(let i=0;i<100;i++)g.updateRun(1/60);
   result.sedative={req:c.strengthReq,effective:c.captureRequirement,weakened:c.weakened};
   // Dispute: launch normal point capture and win by timing inputs.
   x=reset();
   const trophy=new Creature(SPECIES_BY_ID.lanternLeviathan,'giant',x,g.cam.y+130,123);
   g.spawn.creatures=[trophy];g.input.aimY=trophy.y-g.cam.y;
   g.tryStrike(g.cam.y+CONFIG.claw.restTipY);
   let started=false;
   for(let i=0;i<9*120 && trophy.state!=='CAPTURED';i++){
    if(g.fight){started=true;if(g.fight.game.inWindow)g.tapFight();}
    g.updateRun(1/120);
   }
   result.fight={started,captured:trophy.state==='CAPTURED',captures:g.captures.length,clock:g.timeLeft};
   // No capture, treasure or boss reward may extend the clock.
   const time=g.timeLeft;g.captureCreature(new Creature(SPECIES_BY_ID.goldenCrab,'golden',x,trophy.y,2),false,g.time*1000,trophy.y);
   result.captureAddsTime=g.timeLeft-time;
   // Net is unavailable before prestige; after prestige it collects several fish, with cooldown.
   x=reset();
   const fish=new Creature(SPECIES_BY_ID.orangeFish,'normal',x,g.cam.y+130,1);
   g.spawn.creatures=[fish];g.queueTool('net');g.updateRun(1/60);
   result.lockedTool=g.captures.length===0 && g.netCooldown===0;
   x=reset(1);
   g.spawn.creatures=[0,10,20].map((off,i)=>new Creature(SPECIES_BY_ID.orangeFish,'normal',x+off,g.cam.y+130,i+1));
   g.queueTool('net');g.updateRun(1/60);
   result.net={captures:g.captures.length,cooldown:g.netCooldown};
   const cooldown=g.netCooldown;g.pause();g.frame(1);result.pausedCooldown=g.netCooldown===cooldown;
   // Guardian appears where the player is rather than at its old map coordinate.
   x=reset(2);g.save.bosses=[];g.save.bossRage.kingCrab=BOSSES[0].rage;
   g.cam.x=32000;g.cam.snap(g.terrain);g.applyBarrier();g.updateBoss(1/60);
   result.guardian={cam:g.cam.x,x:g.boss.x,id:g.boss.def.id};
   // Harpoon damages an armored guardian at the current aim; repeated fire respects cooldown.
   g.input.aimX=g.boss.x-g.cam.x;g.input.aimY=g.boss.y-g.cam.y;
   g.queueTool('harpoon');g.updateRun(1/60);const damage=g.boss.damage;
   g.queueTool('harpoon');g.updateRun(1/60);
   result.harpoon={damage,cooldown:g.harpoonCooldown,afterSecond:g.boss.damage};
   g.cam.x=40000;g.cam.snap(g.terrain);
   for(let i=0;i<110;i++)g.updateBoss(1/60);
   result.escape={gone:g.boss===null,damage:g.save.bossDamage.kingCrab};
   // Leave a rich old save for testing navigation, tool unlock visibility and collection UI.
   g.save.bestDistance=65000;g.save.bestDepth=10000;g.save.loreSeen=true;g.save.coins=1e8;g.persist();g.toMenu();
   return result;
  });
  console.log(JSON.stringify(results,null,2));
  assert.equal(results.speed.base,120);
  assert.ok(results.speed.max>=600);
  assert.ok(results.speed.duration<=75);
  assert.ok(results.feeding.some(s=>s.meals>=3),'bait must genuinely feed a shark three times');
  assert.ok(results.sedative.effective<results.sedative.req);
  assert.ok(results.fight.started && results.fight.captured);
  assert.equal(results.fight.captures,1);
  assert.equal(results.captureAddsTime,0);
  assert.ok(results.lockedTool);
  assert.equal(results.net.captures,3);
  assert.ok(results.net.cooldown>0 && results.pausedCooldown);
  assert.ok(results.guardian.cam>=32000 && results.guardian.x>32000 && results.guardian.x<32500);
  assert.equal(results.harpoon.damage,1);
  assert.equal(results.harpoon.afterSecond,1);
  assert.ok(results.escape.gone && results.escape.damage===1);
  await page.reload();
  await page.evaluate(()=>window.__abyss.stop());
  await page.locator('.zone-map [data-id="8"]').click();
  const cp=await page.evaluate(()=>window.__abyss.save.checkpoint);
  assert.equal(cp,8);
  await page.click('[data-act="tab"][data-id="skills"]');
  await page.locator('[data-jump="lateral"]').click();
  assert.match(await page.locator('.tree-pop .eff').textContent(),/Natação:/);
  await page.screenshot({path:'/tmp/hunt-tree.png'});
  // Landscape touch UI: real multi-touch buttons and the skill check stay visible.
  await page.setViewportSize({width:844,height:390});
  await page.locator('.tree-bar [data-act="start"]').click();
  await page.locator('#game').dispatchEvent('pointerdown',{pointerType:'touch',pointerId:71,clientX:420,clientY:160});
  await page.evaluate(()=>{const g=window.__abyss;g.stop();g.updateRun(1/60);g.render();});
  assert.ok(await page.locator('#touch').isVisible());
  assert.ok(await page.locator('#t-strike').isVisible());
  await page.screenshot({path:'/tmp/hunt-touch.png'});
  await page.evaluate(async()=>{
    const {Creature}=await import('/src/entities/Creature.ts');
    const {SPECIES_BY_ID}=await import('/src/entities/Species.ts');
    const {CONFIG}=await import('/src/config.ts');
    const g=window.__abyss;
    g.startRun();g.stop();g.spawn.update=()=>{};g.eventTimer=99999;
    const x=g.cam.focus;
    g.spawn.creatures=[new Creature(SPECIES_BY_ID.lanternLeviathan,'giant',x,g.terrain.seabedY(x)-70,91)];
    g.tryStrike(g.cam.y+CONFIG.claw.restTipY);
    for(let i=0;i<60 && !g.fight;i++)g.updateRun(1/60);
    g.render();
  });
  assert.ok(await page.locator('.hunt-fight').isVisible());
  await page.screenshot({path:'/tmp/hunt-struggle.png'});
  for(let i=0;i<6;i++) {
    const done=await page.evaluate(()=>{
      const g=window.__abyss;
      if(!g.fight)return true;
      for(let f=0;f<240;f++) {
        if(g.fight.game.inWindow && g.fight.game.elapsed>0.3)break;
        g.updateRun(1/120);
        if(!g.fight)return true;
      }
      return false;
    });
    if(done)break;
    await page.locator('[data-fish]').dispatchEvent('pointerdown',{pointerType:'touch',pointerId:5});
    await page.evaluate(()=>{for(let i=0;i<40;i++)window.__abyss.updateRun(1/120);});
  }
  assert.equal(await page.evaluate(()=>window.__abyss.captures.length),1);
  assert.deepEqual(errors,[]);
  console.log('HUNT 0.2.0 OK');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
