import { CONFIG } from '../config';
import type { Game, RunSummary } from '../core/Game';
import { clearSave, defaultSave } from '../core/Save';
import { BOSSES, CHECKPOINTS, checkpointUnlocked, nextBoss } from '../entities/Boss';
import { CLAWS, type ClawDefinition } from '../entities/ClawsCatalog';
import { RARITIES, RARITY_COLOR, RARITY_LABEL, SPECIES, SPECIES_BY_ID, VARIANTS, isCreature, strengthRequired } from '../entities/Species';
import { creatureSprite, makeCanvas, Painter } from '../render/PixelArt';
import { paintClaw } from '../render/Renderer';
import { formatCoins } from '../systems/Economy';
import {
  AQUARIUM_MAX_LEVEL, aquariumCapMinutes, aquariumCollect, aquariumIncomePerMinute, aquariumPending, aquariumUpgrade, aquariumUpgradeStars,
  canPrestige, claimDaily, collectionBonus, collectionSets, dailyAvailable, dailyPreview, doPrestige, essenceGain, homeBiome, PRESTIGE_BOSSES,
} from '../systems/Meta';
import { claimOrder, isComplete, orderText } from '../systems/Orders';
import { UPGRADES, buyClaw, canBuy, canBuyClaw, clawPrice, computeStats } from '../systems/Upgrades';
import { BIOMES } from '../world/Biomes';
import { mountAquariumTank } from './AquariumView';
import { SkillTree } from './SkillTree';

type Tab = 'skills' | 'essence' | 'workshop' | 'aquarium' | 'catalog' | 'settings';

const $ = (n: number) => `$${formatCoins(n)}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class Screens {
  private tab: Tab | null = null;
  private confirm: 'reset' | 'prestige' | null = null;
  private ticker = 0;

  constructor(private root: HTMLElement, private game: Game) {
    root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled) return;
      this.game.audio.unlock();
      this.action(el.dataset.act!, el.dataset.id ?? '');
    });
  }

  clear(): void {
    clearInterval(this.ticker);
    this.root.innerHTML = '';
  }

  private action(act: string, id: string): void {
    const g = this.game;
    const s = g.save;
    switch (act) {
      case 'start': this.clear(); g.startRun(); break;
      case 'tab': this.confirm = null; this.showBase(id as Tab); g.audio.play('click'); break;
      case 'home': this.showBase(); g.audio.play('click'); break;
      case 'checkpoint':
        if (checkpointUnlocked(s.bosses, Number(id))) { s.checkpoint = Number(id); g.persist(); g.audio.play('click'); }
        this.rerender();
        break;
      case 'claim':
        if (claimOrder(s, Number(id))) { g.persist(); g.audio.play('buy'); }
        this.rerender();
        break;
      case 'daily':
        if (claimDaily(s, Date.now())) { g.persist(); g.audio.play('newSpecies'); }
        this.rerender();
        break;
      case 'collect':
        if (aquariumCollect(s, Date.now()) > 0) g.audio.play('buy');
        g.persist();
        this.rerender();
        break;
      case 'tankUp':
        if (aquariumUpgrade(s)) { g.persist(); g.audio.play('buy'); }
        this.rerender();
        break;
      case 'buyClaw':
        if (buyClaw(s, id)) { g.persist(); g.refreshStats(); g.audio.play('buy'); }
        this.rerender();
        break;
      case 'equip':
        if (s.ownedClaws.includes(id)) { s.equippedClaw = id; g.persist(); g.refreshStats(); g.audio.play('click'); }
        this.rerender();
        break;
      case 'mute':
        s.settings.muted = !s.settings.muted;
        g.audio.muted = s.settings.muted;
        g.persist();
        this.rerender();
        break;
      case 'mute-pause':
        s.settings.muted = !s.settings.muted;
        g.audio.muted = s.settings.muted;
        g.persist();
        this.showPause();
        break;
      case 'vibrate':
        s.settings.vibrate = !s.settings.vibrate;
        g.persist();
        if (s.settings.vibrate) navigator.vibrate?.(30);
        this.rerender();
        break;
      case 'reset':
        if (this.confirm !== 'reset') { this.confirm = 'reset'; this.rerender(); break; }
        clearSave();
        g.save = defaultSave();
        g.persist();
        this.confirm = null;
        location.reload();
        break;
      case 'prestige':
        if (this.confirm !== 'prestige') { this.confirm = 'prestige'; this.rerender(); break; }
        if (doPrestige(s) > 0) { g.persist(); g.refreshStats(); g.audio.play('newSpecies'); }
        this.confirm = null;
        this.rerender();
        break;
      case 'cancel': this.confirm = null; this.rerender(); break;
      case 'resume': this.clear(); g.resume(); break;
      case 'quit': this.clear(); g.endRun(); break;
      case 'again': this.clear(); g.startRun(); break;
      case 'upgrades': g.toMenu(); this.showBase('skills'); break;
      case 'menu': g.toMenu(); this.showBase(); break;
    }
  }

  private rerender(): void {
    const body = this.root.querySelector('.panel-body, .base');
    const scroll = body?.scrollTop ?? 0;
    this.showBase(this.tab ?? undefined);
    const nb = this.root.querySelector('.panel-body, .base');
    if (nb) nb.scrollTop = scroll;
  }

  // ───────────────────────── base

  showBase(tab?: Tab): void {
    clearInterval(this.ticker);
    this.tab = tab ?? null;
    if (!tab) {
      this.root.innerHTML = this.homeHtml();
      // the aquarium keeps earning while you look at the base
      this.ticker = window.setInterval(() => {
        const el = this.root.querySelector('[data-live="tank"]');
        if (el) el.textContent = $(aquariumPending(this.game.save, Date.now()));
      }, 1000);
      return;
    }
    const s = this.game.save;
    const tabs: [Tab, string][] = [['skills', 'Habilidades'], ['workshop', 'Oficina'], ['aquarium', 'Aquário'], ['catalog', 'Catálogo'], ['essence', 'Renascer'], ['settings', 'Config.']];
    this.root.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <button class="btn small" data-act="home">◀ Base</button>
          <div class="tabs">${tabs.map(([t, l]) => `<button class="tab ${t === tab ? 'on' : ''}" data-act="tab" data-id="${t}">${l}</button>`).join('')}</div>
          <span class="spacer"></span>
          <span class="coins">${$(s.coins)}</span><span class="stars">${s.stars}★</span>${s.essence || tab === 'essence' ? `<span class="ess">✦${s.essence}</span>` : ''}
          <button class="btn small primary go" data-act="start">MERGULHAR</button>
        </div>
        <div class="panel-body ${tab === 'skills' ? 'tree-body' : ''} ${tab === 'essence' ? 'split-body' : ''}">${this.tabHtml(tab)}</div>
      </div>`;
    const head = this.root.querySelector('.panel-head')!;
    const refreshHead = () => {
      head.querySelector('.coins')!.textContent = $(s.coins);
      const e = head.querySelector('.ess');
      if (e) e.textContent = `✦${s.essence}`;
    };
    if (tab === 'skills') new SkillTree(this.root.querySelector('.panel-body')!, this.game, refreshHead, 'main');
    if (tab === 'essence') new SkillTree(this.root.querySelector('.ess-tree')!, this.game, refreshHead, 'essence');
    if (tab === 'workshop') this.fillWorkshop();
    if (tab === 'catalog') this.fillCatalog();
    if (tab === 'aquarium') mountAquariumTank(this.root.querySelector('.tank-host')!, s);
  }

  private tabHtml(tab: Tab): string {
    switch (tab) {
      case 'skills': return '';
      case 'essence': return this.essenceHtml();
      case 'workshop': return '<div class="claws"></div>';
      case 'catalog': return '<div class="catalog"></div>';
      case 'aquarium': return this.aquariumHtml();
      case 'settings': return this.settingsHtml();
    }
  }

  private affordableCount(): number {
    const s = this.game.save;
    return UPGRADES.filter((u) => u.tree === 'main' && canBuy(s, u.id) === 'ok').length + CLAWS.filter((c) => canBuyClaw(s, c.id) === 'ok').length;
  }

  private objectiveHtml(): string {
    const s = this.game.save;
    const b = nextBoss(s.bosses);
    if (!b) {
      return `<div class="card objective done">
        <div class="obj-kicker">ABISMO CONQUISTADO</div>
        <b>Todos os guardiões foram capturados!</b>
        <p class="desc">Renasça para ganhar Essência Abissal e voltar ainda mais forte.</p>
      </div>`;
    }
    const st = computeStats(s);
    const dmg = s.bossDamage[b.id] ?? 0;
    const pips = b.weakPoints.map((_, i) => `<i class="${i < dmg ? 'done' : ''}"></i>`).join('');
    const strong = st.strength >= b.strength;
    const idx = BOSSES.indexOf(b);
    return `<div class="card objective">
      <div class="obj-kicker">OBJETIVO · GUARDIÃO ${idx + 1}/${BOSSES.length}</div>
      <b>Capture: ${esc(b.name)}</b>
      <p class="desc">Bloqueia o fim do bioma ${esc(BIOMES[Math.min(idx, BIOMES.length - 1)].name)} (distância ${b.x.toLocaleString('pt-BR')}). Agarre os pontos fracos brilhantes quando abrirem.</p>
      <div class="obj-row"><div class="pips boss-pips">${pips}</div><span>${dmg}/${b.weakPoints.length} pontos fracos</span></div>
      <div class="obj-row"><span class="${strong ? 'ok' : 'lock'}">Força ${st.strength.toFixed(1)} / ${b.strength.toFixed(1)}${strong ? ' ✔' : ' — compre Força na árvore'}</span></div>
      <div class="obj-row reward">Recompensa: ${$(b.coins)} · ${b.stars}★ · novo ponto de partida</div>
    </div>`;
  }

  private ordersHtml(): string {
    const s = this.game.save;
    return `<div class="card orders">
      <div class="obj-kicker">ENCOMENDAS</div>
      ${s.orders
        .map((o) => {
          const done = isComplete(o);
          const pct = Math.round((Math.min(o.progress, o.target) / o.target) * 100);
          const big = o.kind === 'reachDepth' || o.kind === 'runCoins';
          const prog = big ? `${Math.floor(o.progress).toLocaleString('pt-BR')}/${o.target.toLocaleString('pt-BR')}` : `${Math.floor(o.progress)}/${o.target}`;
          return `<div class="order ${done ? 'done' : ''}">
            <div class="order-top"><span>${esc(orderText(o))}</span>${done ? `<button class="btn small claim" data-act="claim" data-id="${o.id}">Resgatar</button>` : `<span class="lvl">${prog}</span>`}</div>
            <div class="bar"><i style="width:${pct}%"></i></div>
            <div class="order-reward">${$(o.coins)} · ${o.stars}★</div>
          </div>`;
        })
        .join('')}
    </div>`;
  }

  private homeHtml(): string {
    const s = this.game.save;
    const now = Date.now();
    const n = this.affordableCount();
    const st = computeStats(s);
    const found = SPECIES.filter((sp) => isCreature(sp) && (s.species[sp.id]?.caught ?? 0) > 0).length;
    const total = SPECIES.filter(isCreature).length;
    const daily = dailyAvailable(s, now) ? dailyPreview(s, now) : null;
    const pending = aquariumPending(s, now);
    const cps = CHECKPOINTS.map((c, i) => {
      const ok = checkpointUnlocked(s.bosses, i);
      return `<button class="cp ${s.checkpoint === i ? 'on' : ''}" data-act="checkpoint" data-id="${i}" ${ok ? '' : 'disabled'}>${ok ? '' : '🔒 '}${esc(c.name)}</button>`;
    }).join('');
    const prestigeReady = canPrestige(s);
    return `
      <div class="base">
        <div class="base-top">
          <h1 class="logo">ABYSS <span>CLAW</span></h1>
          <div class="chips">
            <span class="chip">Saldo <b>${$(s.coins)}</b></span>
            <span class="chip">Estrelas <b>${s.stars}★</b></span>
            ${s.essence || s.prestiges ? `<span class="chip">Essência <b class="ess">✦${s.essence}</b></span>` : ''}
            <span class="chip">Recorde <b>${Math.round(s.bestDepth).toLocaleString('pt-BR')} m</b></span>
            <span class="chip">Espécies <b>${found}/${total}</b></span>
          </div>
        </div>
        <div class="base-grid">
          <div class="base-col">
            ${this.objectiveHtml()}
            <div class="start-box">
              <button class="btn primary" data-act="start">INICIAR MERGULHO</button>
              <div class="cp-row"><span class="cp-label">Partida:</span>${cps}</div>
              <div class="mini">${st.runSeconds}s · garra ${esc(st.claw.name)} · força ${st.strength.toFixed(1)}</div>
            </div>
          </div>
          <div class="base-col">
            ${this.ordersHtml()}
            <div class="row gifts">
              ${daily ? `<button class="btn gift" data-act="daily">🎁 Presente do dia ${daily.streak}: ${$(daily.coins)} + ${daily.stars}★</button>` : ''}
              ${s.aquarium.last ? `<button class="btn tankbtn" data-act="collect" ${pending > 0 ? '' : 'disabled'}>🐠 Aquário: <b data-live="tank">${$(pending)}</b> · Coletar</button>` : ''}
            </div>
          </div>
        </div>
        <div class="row nav">
          <button class="btn" data-act="tab" data-id="skills">Habilidades${n ? `<span class="badge">${n}</span>` : ''}</button>
          <button class="btn" data-act="tab" data-id="workshop">Oficina</button>
          <button class="btn" data-act="tab" data-id="aquarium">Aquário</button>
          <button class="btn" data-act="tab" data-id="catalog">Catálogo</button>
          <button class="btn ${prestigeReady ? 'glow' : ''}" data-act="tab" data-id="essence">Renascer${prestigeReady ? '<span class="badge">!</span>' : ''}</button>
          <button class="btn" data-act="tab" data-id="settings">Config.</button>
        </div>
      </div>`;
  }

  // ───────────────────────── tabs

  private essenceHtml(): string {
    const s = this.game.save;
    const gain = essenceGain(s);
    const ready = canPrestige(s);
    let action: string;
    if (this.confirm === 'prestige') {
      action = `<p class="lock">Tem certeza? Você perde moedas, a árvore de habilidades e as garras${s.upgrades.e_routes ? '' : ', os guardiões e os pontos de partida'}.</p>
        <div class="row"><button class="btn danger" data-act="prestige">Renascer agora (+✦${gain})</button><button class="btn" data-act="cancel">Cancelar</button></div>`;
    } else if (ready) action = `<button class="btn primary" data-act="prestige">RENASCER (+✦${gain})</button>`;
    else if (s.bosses.length < PRESTIGE_BOSSES) action = `<p class="lock">🔒 Capture ${PRESTIGE_BOSSES} guardiões para poder renascer (${s.bosses.length}/${PRESTIGE_BOSSES}).</p>`;
    else action = `<p class="lock">Ganhe mais moedas nesta vida para gerar Essência (${$(500)} = ✦1).</p>`;
    return `<div class="ess-info scroll">
        <h3>Renascer</h3>
        <p class="desc">Volte ao começo trocando o progresso desta vida por <b class="ess">Essência Abissal ✦</b>, que compra melhorias permanentes na árvore ao lado. Espécies, estrelas, aquário e essência nunca se perdem.</p>
        <p class="eff">Ganho atual: <b class="ess">✦${gain}</b> · renascimentos: ${s.prestiges}<br>Moedas nesta vida: ${$(s.earnedThisLife)}</p>
        ${action}
      </div>
      <div class="ess-tree"></div>`;
  }

  private aquariumHtml(): string {
    const s = this.game.save;
    const now = Date.now();
    const income = aquariumIncomePerMinute(s);
    const pending = aquariumPending(s, now);
    const lvl = s.aquarium.level;
    const upCost = aquariumUpgradeStars(lvl);
    const sets = collectionSets(s);
    const bonus = collectionBonus(s);
    return `<div class="aqua">
      <div class="aqua-left">
        <div class="tank-host"></div>
        <div class="row">
          <button class="btn primary" data-act="collect" ${pending > 0 ? '' : 'disabled'}>Coletar ${$(pending)}</button>
          ${lvl < AQUARIUM_MAX_LEVEL ? `<button class="btn" data-act="tankUp" ${s.stars >= upCost ? '' : 'disabled'}>Ampliar (nível ${lvl + 1}) · ${upCost}★</button>` : '<span class="equipped">AQUÁRIO NO MÁXIMO</span>'}
        </div>
        <p class="eff">Renda: ${$(Math.round(income))}/min · acumula até ${Math.round(aquariumCapMinutes(s) / 60)}h fora do jogo</p>
        <p class="desc">Cada espécie capturada vive aqui e rende moedas mesmo com o jogo fechado. Quanto mais exemplares, mais renda.</p>
      </div>
      <div class="aqua-right scroll">
        <h3>Coleções <span class="ok">+${Math.round(bonus * 100)}% no valor das capturas</span></h3>
        ${sets
          .map((set) => `<div class="card set ${set.complete ? 'maxed' : ''}">
            <div class="card-top"><b>${esc(set.name)}</b><span class="lvl">${set.found}/${set.species.length}</span></div>
            <div class="bar"><i style="width:${set.species.length ? Math.round((set.found / set.species.length) * 100) : 0}%"></i></div>
            <div class="set-sp">${set.species.map((sp) => `<span class="${(s.species[sp.id]?.caught ?? 0) > 0 ? 'got' : ''}">${(s.species[sp.id]?.caught ?? 0) > 0 ? esc(sp.name) : '???'}</span>`).join('')}</div>
            <div class="order-reward">${set.complete ? '✔ Completa: +10% no valor de toda captura' : 'Complete para +10% no valor de toda captura'}</div>
          </div>`)
          .join('')}
      </div>
    </div>`;
  }

  private fillWorkshop(): void {
    const s = this.game.save;
    const box = this.root.querySelector('.claws')!;
    const maxOf = (f: (c: ClawDefinition) => number) => Math.max(...CLAWS.map(f));
    const speedOf = (c: ClawDefinition) => 1000 / (c.strikeMs + c.retractMs + c.cooldownMs + CONFIG.claw.anticipationMs + CONFIG.claw.closeMs);
    for (const c of CLAWS) {
      const res = canBuyClaw(s, c.id);
      const owned = res === 'owned';
      const equipped = s.equippedClaw === c.id;
      const card = document.createElement('div');
      card.className = `card claw-card ${res === 'ok' ? 'can' : ''} ${equipped ? 'maxed' : ''}`;
      const cv = makeCanvas(24, 36);
      paintClaw(cv.getContext('2d')!, new Painter(cv), 12, 26, c, c.opening, 0);
      const bar = (label: string, v: number, m: number) => `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${Math.round((v / m) * 100)}%"></i></div></div>`;
      const price = `${$(clawPrice(s, c))}${c.stars ? ` + ${c.stars}★` : ''}`;
      let action: string;
      if (equipped) action = '<span class="equipped">✔ EQUIPADA</span>';
      else if (owned) action = `<button class="btn" data-act="equip" data-id="${c.id}">Equipar</button>`;
      else if (res === 'locked') action = `<span class="lock">🔒 Alcance ${c.unlockDepth.toLocaleString('pt-BR')} m de profundidade</span>`;
      else action = `<button class="btn" data-act="buyClaw" data-id="${c.id}" ${res === 'ok' ? '' : 'disabled'}>Comprar ${price}</button>`;
      card.innerHTML = `<div></div><div style="display:flex;flex-direction:column;gap:calc(var(--u)*0.6)">
          <div class="card-top"><b>${esc(c.name)}</b>${c.maxTargets > 1 ? `<span class="lvl">até ${c.maxTargets} alvos</span>` : ''}</div>
          <p class="desc">${esc(c.description)}</p>
          ${bar('Força', c.strength, maxOf((x) => x.strength))}
          ${bar('Velocidade', speedOf(c), maxOf(speedOf))}
          ${bar('Abertura', c.opening, maxOf((x) => x.opening))}
          ${action}
        </div>`;
      card.firstElementChild!.appendChild(cv);
      box.appendChild(card);
    }
  }

  private fillCatalog(): void {
    const s = this.game.save;
    const box = this.root.querySelector('.catalog')!;
    for (const sp of SPECIES.filter(isCreature)) {
      const rec = s.species[sp.id];
      const known = (rec?.caught ?? 0) > 0;
      const el = document.createElement('div');
      el.className = 'spc';
      const cv = makeCanvas(28, 21);
      const ctx = cv.getContext('2d')!;
      const w = Math.min(24, sp.size.w), h = Math.min(18, sp.size.h);
      if (sp.shapeParts === 'eel') {
        ctx.fillStyle = known ? sp.palette.main : '#06131f';
        for (let i = 0; i < 12; i++) ctx.fillRect(3 + i * 2, 10 + Math.round(Math.sin(i * 0.8) * 2), 2, 3);
        if (known) { ctx.fillStyle = sp.palette.dark; for (let i = 0; i < 12; i += 3) ctx.fillRect(3 + i * 2, 10 + Math.round(Math.sin(i * 0.8) * 2), 2, 3); }
      } else {
        const spr = creatureSprite(sp, 'normal', w, h, 0);
        ctx.drawImage(spr, Math.round((28 - spr.width) / 2), Math.round((21 - spr.height) / 2));
        if (!known) {
          ctx.globalCompositeOperation = 'source-in';
          ctx.fillStyle = '#06131f';
          ctx.fillRect(0, 0, 28, 21);
        }
      }
      const variants = (rec?.variants ?? []).filter((v) => v !== 'normal').map((v) => VARIANTS[v].label);
      const hb = homeBiome(sp);
      const where = hb === null ? 'Aparece em eventos e tesouros' : sp.minDepth < 50 ? `Habitat: ${BIOMES[hb].name}` : `Habitat: ${BIOMES[hb].name} (a partir de ~${sp.minDepth.toLocaleString('pt-BR')} m)`;
      el.innerHTML = `<div></div><div>
        <div class="name">${known ? esc(sp.name) : '???'}</div>
        <div class="rar" style="color:${RARITY_COLOR[sp.rarity]}">${RARITY_LABEL[sp.rarity]}</div>
        <div class="meta">${known
          ? `Capturas: ${rec!.caught} · Valor base ${$(sp.baseValue)} · Força ${strengthRequired(sp, 'normal').toFixed(1)}<br>${esc(sp.description)}${variants.length ? `<br>Variantes: ${esc(variants.join(', '))}` : ''}`
          : esc(where)}</div>
      </div>`;
      el.firstElementChild!.replaceWith(cv);
      box.appendChild(el);
    }
  }

  private settingsHtml(): string {
    const s = this.game.save;
    return `<div class="settings">
      <div class="row" style="justify-content:flex-start">
        <button class="btn" data-act="mute">${s.settings.muted ? '🔇 Som desligado' : '🔊 Som ligado'}</button>
        <button class="btn" data-act="vibrate">${s.settings.vibrate ? '📳 Vibração ligada' : '📴 Vibração desligada'}</button>
      </div>
      <p><b>Controles no PC:</b> mova o mouse para mirar, <kbd>clique</kbd> ou <kbd>Espaço</kbd> para atacar, <kbd>A</kbd>/<kbd>D</kbd> ou <kbd>◀</kbd>/<kbd>▶</kbd> para navegar, <kbd>Shift</kbd> turbo, <kbd>Esc</kbd>/<kbd>P</kbd> pausa.</p>
      <p><b>No celular (horizontal):</b> a garra fica no centro; <kbd>◀</kbd> <kbd>▶</kbd> alinham o oceano com ela, <kbd>TURBO</kbd> acelera e <kbd>CAPTURAR</kbd> faz a garra descer reto e pegar o primeiro bicho no caminho (marcado em amarelo).</p>
      <p><b>Dicas:</b> 5 capturas seguidas ativam o <b>Frenesi</b>. Guardiões só podem ser agarrados nos pontos fracos brilhantes, e só com força suficiente. Baús podem ser… outra coisa.</p>
      <p>Estatísticas: ${s.totalRuns} mergulhos · ${s.totalCaptures} capturas · ${$(s.totalEarned)} ganhos · ${s.ordersDone} encomendas · ${s.bosses.length}/${BOSSES.length} guardiões</p>
      <div class="row" style="justify-content:flex-start">
        ${this.confirm === 'reset'
          ? `<span class="lock">Apagar TODO o progresso? Não dá para desfazer.</span>
             <button class="btn danger" data-act="reset">Sim, apagar</button>
             <button class="btn" data-act="cancel">Cancelar</button>`
          : `<button class="btn danger" data-act="reset">Apagar progresso</button>`}
      </div>
    </div>`;
  }

  // ───────────────────────── in-run overlays

  showPause(): void {
    const muted = this.game.save.settings.muted;
    this.root.innerHTML = `
      <div class="pause">
        <h2>PAUSADO</h2>
        <button class="btn primary" data-act="resume">CONTINUAR</button>
        <button class="btn" data-act="mute-pause">${muted ? '🔇 Som desligado' : '🔊 Som ligado'}</button>
        <button class="btn danger" data-act="quit">Encerrar mergulho</button>
      </div>`;
  }

  showResults(r: RunSummary): void {
    const s = this.game.save;
    const rarityChips = RARITIES.filter((k) => r.rarityCounts[k])
      .map((k) => `<span class="chip" style="border-color:${RARITY_COLOR[k]}"><b style="color:${RARITY_COLOR[k]}">${r.rarityCounts[k]}</b> ${RARITY_LABEL[k]}</span>`)
      .join('');
    const newSp = r.newSpecies.map((id) => `<span class="chip">★ ${esc(SPECIES_BY_ID[id].name)}</span>`).join('');
    const n = this.affordableCount();
    const claimable = s.orders.filter(isComplete).length;
    const highlights = [
      ...r.bossesDefeated.map((b) => `<span class="chip hl">👑 Guardião capturado: <b>${esc(b)}</b></span>`),
      r.weakPointsHit && !r.bossesDefeated.length ? `<span class="chip">Pontos fracos agarrados: <b>${r.weakPointsHit}</b></span>` : '',
      ...r.ordersCompleted.map((o) => `<span class="chip ok-chip">✔ ${esc(o)}</span>`),
    ].join('');
    this.root.innerHTML = `
      <div class="results">
        <h2>FIM DO MERGULHO</h2>
        <div class="res-grid">
          <div><b>${r.captures.length}</b><span>capturas</span></div>
          <div><b class="gold">+${$(r.coins)}</b><span>saldo agora ${$(s.coins)}</span></div>
          <div><b>${Math.round(r.maxDepth).toLocaleString('pt-BR')} m</b><span>profundidade máx.</span>${r.depthRecord ? '<div class="rec">NOVO RECORDE!</div>' : ''}</div>
          <div><b class="gold">${r.stars ? `+${r.stars}★` : r.newSpecies.length}</b><span>${r.stars ? 'estrelas' : 'espécies novas'}</span></div>
        </div>
        ${highlights ? `<div class="chips">${highlights}</div>` : ''}
        ${rarityChips ? `<div class="chips">${rarityChips}${r.bestCombo > 1 ? `<span class="chip">Combo máx. <b>x${r.bestCombo}</b></span>` : ''}${r.bonusSeconds > 0 ? `<span class="chip">Tempo bônus <b>+${Math.round(r.bonusSeconds)}s</b></span>` : ''}</div>` : '<p class="tagline">Nenhuma captura desta vez. Mire onde o bicho vai estar!</p>'}
        ${newSp ? `<div class="newsp">${newSp}</div>` : ''}
        ${claimable ? `<p class="hint">${claimable} encomenda(s) pronta(s) para resgatar na base!</p>` : n ? `<p class="hint">Você pode comprar ${n} melhoria(s) agora!</p>` : ''}
        <div class="row">
          <button class="btn primary" data-act="again">MERGULHAR DE NOVO</button>
          <button class="btn" data-act="upgrades">Melhorias${n ? `<span class="badge">${n}</span>` : ''}</button>
          <button class="btn" data-act="menu">Base${claimable ? `<span class="badge">${claimable}</span>` : ''}</button>
        </div>
      </div>`;
  }
}
