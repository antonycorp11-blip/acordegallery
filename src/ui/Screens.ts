import { CONFIG } from '../config';
import type { Game, RunSummary } from '../core/Game';
import { clearSave, defaultSave } from '../core/Save';
import { CLAWS, CLAWS_BY_ID, type ClawDefinition } from '../entities/ClawsCatalog';
import { RARITIES, RARITY_COLOR, RARITY_LABEL, SPECIES, SPECIES_BY_ID, VARIANTS, strengthRequired } from '../entities/Species';
import { creatureSprite, makeCanvas, Painter } from '../render/PixelArt';
import { paintClaw } from '../render/Renderer';
import { formatCoins } from '../systems/Economy';
import { SkillTree } from './SkillTree';
import {
  UPGRADES, buyClaw, buyUpgrade, canBuy, canBuyClaw, computeStats,
} from '../systems/Upgrades';

type Tab = 'skills' | 'workshop' | 'catalog' | 'settings';

const $ = (n: number) => `$${formatCoins(n)}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class Screens {
  private tab: Tab | null = null;
  private confirmReset = false;

  constructor(private root: HTMLElement, private game: Game) {
    root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled) return;
      this.game.audio.unlock();
      this.action(el.dataset.act!, el.dataset.id ?? '');
    });
  }

  clear(): void {
    this.root.innerHTML = '';
  }

  private action(act: string, id: string): void {
    const g = this.game;
    switch (act) {
      case 'start': this.clear(); g.startRun(); break;
      case 'tab': this.confirmReset = false; this.showBase(id as Tab); g.audio.play('click'); break;
      case 'home': this.showBase(); g.audio.play('click'); break;
      case 'buy':
        if (buyUpgrade(g.save, id) === 'ok') { g.persist(); g.refreshStats(); g.audio.play('buy'); }
        this.rerender();
        break;
      case 'buyClaw':
        if (buyClaw(g.save, id)) { g.persist(); g.refreshStats(); g.audio.play('buy'); }
        this.rerender();
        break;
      case 'equip':
        if (g.save.ownedClaws.includes(id)) { g.save.equippedClaw = id; g.persist(); g.refreshStats(); g.audio.play('click'); }
        this.rerender();
        break;
      case 'mute':
        g.save.settings.muted = !g.save.settings.muted;
        g.audio.muted = g.save.settings.muted;
        g.persist();
        this.rerender();
        break;
      case 'reset':
        if (!this.confirmReset) { this.confirmReset = true; this.rerender(); break; }
        clearSave();
        g.save = defaultSave();
        g.persist();
        g.refreshStats();
        this.confirmReset = false;
        this.showBase();
        break;
      case 'mute-pause':
        g.save.settings.muted = !g.save.settings.muted;
        g.audio.muted = g.save.settings.muted;
        g.persist();
        this.showPause();
        break;
      case 'cancelReset': this.confirmReset = false; this.rerender(); break;
      case 'resume': this.clear(); g.resume(); break;
      case 'quit': this.clear(); g.endRun(); break;
      case 'again': this.clear(); g.startRun(); break;
      case 'upgrades': g.toMenu(); this.showBase('skills'); break;
      case 'menu': g.toMenu(); this.showBase(); break;
    }
  }

  private rerender(): void {
    const body = this.root.querySelector('.panel-body');
    const scroll = body?.scrollTop ?? 0;
    this.showBase(this.tab ?? undefined);
    const nb = this.root.querySelector('.panel-body');
    if (nb) nb.scrollTop = scroll;
  }

  // ───────────────────────── base

  showBase(tab?: Tab): void {
    this.tab = tab ?? null;
    if (!tab) {
      this.root.innerHTML = this.homeHtml();
      return;
    }
    const s = this.game.save;
    const tabs: [Tab, string][] = [['skills', 'Habilidades'], ['workshop', 'Oficina'], ['catalog', 'Catálogo'], ['settings', 'Config.']];
    this.root.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <button class="btn small" data-act="home">◀ Base</button>
          <div class="tabs">${tabs.map(([t, l]) => `<button class="tab ${t === tab ? 'on' : ''}" data-act="tab" data-id="${t}">${l}</button>`).join('')}</div>
          <h2></h2>
          <span class="coins">${$(s.coins)}</span>
          <button class="btn small primary" data-act="start" style="font-size:0.9em;padding:calc(var(--u)*1) calc(var(--u)*2.4)">MERGULHAR</button>
        </div>
        <div class="panel-body ${tab === 'skills' ? 'tree-body' : ''}">${tab === 'skills' ? '' : tab === 'workshop' ? '<div class="claws"></div>' : tab === 'catalog' ? '<div class="catalog"></div>' : this.settingsHtml()}</div>
      </div>`;
    if (tab === 'skills') {
      const coins = this.root.querySelector('.panel-head .coins')!;
      new SkillTree(this.root.querySelector('.panel-body')!, this.game, () => (coins.textContent = $(this.game.save.coins)));
    }
    if (tab === 'workshop') this.fillWorkshop();
    if (tab === 'catalog') this.fillCatalog();
  }

  private affordableCount(): number {
    const s = this.game.save;
    return UPGRADES.filter((u) => canBuy(s, u.id) === 'ok').length + CLAWS.filter((c) => canBuyClaw(s, c.id) === 'ok').length;
  }

  private homeHtml(): string {
    const s = this.game.save;
    const claw = CLAWS_BY_ID[s.equippedClaw];
    const found = SPECIES.filter((sp) => (s.species[sp.id]?.caught ?? 0) > 0).length;
    const n = this.affordableCount();
    const st = computeStats(s);
    return `
      <div class="base">
        <h1 class="logo">ABYSS <span>CLAW</span></h1>
        <p class="tagline">Mire. Ataque. Capture. Avance para a direita: mais fundo, mais estranho, mais valioso.</p>
        <div class="chips">
          <span class="chip">Saldo <b>${$(s.coins)}</b></span>
          <span class="chip">Garra <b>${esc(claw.name)}</b></span>
          <span class="chip">Tempo <b>${st.runSeconds}s</b></span>
          <span class="chip">Recorde <b>${Math.round(s.bestDepth).toLocaleString('pt-BR')} m</b></span>
          <span class="chip">Espécies <b>${found}/${SPECIES.length}</b></span>
        </div>
        <button class="btn primary" data-act="start">INICIAR MERGULHO</button>
        <div class="row">
          <button class="btn" data-act="tab" data-id="skills">Habilidades${n ? `<span class="badge">${n}</span>` : ''}</button>
          <button class="btn" data-act="tab" data-id="workshop">Oficina</button>
          <button class="btn" data-act="tab" data-id="catalog">Catálogo</button>
          <button class="btn" data-act="tab" data-id="settings">Config.</button>
        </div>
        <div class="help">PC: mouse mira · clique ou Espaço ataca · A/D ou ◀ ▶ navega · Esc pausa &nbsp;|&nbsp; Celular: toque no mar para mirar · CAPTURAR ataca · ◀ ▶ navega</div>
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
      const ctx = cv.getContext('2d')!;
      paintClaw(ctx, new Painter(cv), 12, 26, c, c.opening, 0);
      const bar = (label: string, v: number, m: number) => `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${Math.round((v / m) * 100)}%"></i></div></div>`;
      let action: string;
      if (equipped) action = '<span class="equipped">✔ EQUIPADA</span>';
      else if (owned) action = `<button class="btn" data-act="equip" data-id="${c.id}">Equipar</button>`;
      else if (res === 'locked') action = `<span class="lock">🔒 Alcance ${c.unlockDepth.toLocaleString('pt-BR')} m de profundidade</span>`;
      else action = `<button class="btn" data-act="buyClaw" data-id="${c.id}" ${res === 'ok' ? '' : 'disabled'}>Comprar ${$(c.price)}</button>`;
      card.innerHTML = `<div></div><div style="display:flex;flex-direction:column;gap:calc(var(--u)*0.6)">
          <div class="card-top"><b>${esc(c.name)}</b>${c.maxTargets > 1 ? `<span class="lvl">até ${c.maxTargets} alvos</span>` : ''}</div>
          <p class="desc">${esc(c.description)}</p>
          ${bar('Força', c.strength, maxOf((x) => x.strength))}
          ${bar('Velocidade', speedOf(c), maxOf(speedOf))}
          ${bar('Abertura', c.opening, maxOf((x) => x.opening))}
          ${c.stunMs ? bar('Atordoar', c.stunMs, c.stunMs) : ''}
          ${action}
        </div>`;
      card.firstElementChild!.appendChild(cv);
      box.appendChild(card);
    }
  }

  private fillCatalog(): void {
    const s = this.game.save;
    const box = this.root.querySelector('.catalog')!;
    for (const sp of SPECIES) {
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
      el.innerHTML = `<div></div><div>
        <div class="name">${known ? esc(sp.name) : '???'}</div>
        <div class="rar" style="color:${RARITY_COLOR[sp.rarity]}">${RARITY_LABEL[sp.rarity]}</div>
        <div class="meta">${known
          ? `Capturas: ${rec!.caught} · Valor base ${$(sp.baseValue)} · Força ${strengthRequired(sp, 'normal').toFixed(1)}<br>${esc(sp.description)}${variants.length ? `<br>Variantes: ${esc(variants.join(', '))}` : ''}`
          : sp.minDepth < 50 ? 'Habitat: águas rasas' : `Habitat: a partir de ~${sp.minDepth.toLocaleString('pt-BR')} m`}</div>
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
      </div>
      <p><b>Controles no PC:</b> mova o mouse para mirar, <kbd>clique</kbd> ou <kbd>Espaço</kbd> para atacar, <kbd>A</kbd>/<kbd>D</kbd> ou <kbd>◀</kbd>/<kbd>▶</kbd> para navegar, <kbd>Esc</kbd>/<kbd>P</kbd> pausa.</p>
      <p><b>No celular (horizontal):</b> toque ou arraste no mar para mirar, botão <kbd>CAPTURAR</kbd> ataca, <kbd>◀</kbd> <kbd>▶</kbd> navegam. Dá para mirar com um dedo e atacar com outro.</p>
      <p>Estatísticas: ${s.totalRuns} mergulhos · ${s.totalCaptures} capturas · ${$(s.totalEarned)} ganhos · distância recorde ${Math.round(s.bestDistance).toLocaleString('pt-BR')}</p>
      <div class="row" style="justify-content:flex-start">
        ${this.confirmReset
          ? `<span class="lock">Apagar TODO o progresso? Não dá para desfazer.</span>
             <button class="btn danger" data-act="reset">Sim, apagar</button>
             <button class="btn" data-act="cancelReset">Cancelar</button>`
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
    this.root.innerHTML = `
      <div class="results">
        <h2>FIM DO MERGULHO</h2>
        <div class="res-grid">
          <div><b>${r.captures.length}</b><span>capturas</span></div>
          <div><b class="gold">+${$(r.coins)}</b><span>saldo agora ${$(s.coins)}</span></div>
          <div><b>${Math.round(r.maxDepth).toLocaleString('pt-BR')} m</b><span>profundidade máx.</span>${r.depthRecord ? '<div class="rec">NOVO RECORDE!</div>' : ''}</div>
          <div><b>${r.newSpecies.length}</b><span>espécies novas</span></div>
        </div>
        ${rarityChips ? `<div class="chips">${rarityChips}${r.bestCombo > 1 ? `<span class="chip">Combo máx. <b>x${r.bestCombo}</b></span>` : ''}${r.bonusSeconds > 0 ? `<span class="chip">Tempo bônus <b>+${Math.round(r.bonusSeconds)}s</b></span>` : ''}</div>` : '<p class="tagline">Nenhuma captura desta vez. Mire onde o bicho vai estar!</p>'}
        ${newSp ? `<div class="newsp">${newSp}</div>` : ''}
        ${n ? `<p class="hint">Você pode comprar ${n} melhoria(s) agora!</p>` : ''}
        <div class="row">
          <button class="btn primary" data-act="again">MERGULHAR DE NOVO</button>
          <button class="btn" data-act="upgrades">Melhorias${n ? `<span class="badge">${n}</span>` : ''}</button>
          <button class="btn" data-act="menu">Base</button>
        </div>
      </div>`;
  }
}
