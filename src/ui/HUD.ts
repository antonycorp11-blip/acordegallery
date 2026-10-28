import { CONFIG } from '../config';
import type { RunHud } from '../core/Game';
import { formatCoins } from '../systems/Economy';

/** Compact in-run HUD (DOM). Only touches the DOM when values change. */
export class HUD {
  readonly root: HTMLElement;
  private timer: HTMLElement;
  private combo: HTMLElement;
  readonly coinsEl: HTMLElement;
  private caps: HTMLElement;
  private depth: HTMLElement;
  private rec: HTMLElement;
  private turboBar: HTMLElement;
  private bossBox: HTMLElement;
  private bannerEl: HTMLElement;
  readonly pauseBtn: HTMLButtonElement;
  private quotaBar: HTMLElement;
  private quotaTxt: HTMLElement;
  private quotaBox: HTMLElement;
  private baitDot: HTMLElement;
  private baitTxt: HTMLElement;
  private flashEl: HTMLElement;
  /** mirrors the bait counter on the touch button */
  onBait: (name: string, count: number, color: string) => void = () => {};
  private last = { t: '', c: -1, n: -1, d: -1, r: -1, k: '', warn: false, turbo: -1, boss: '', q: '', b: '', f: '', tide: false };
  private prevTime = 0;
  private bonusUntil = 0;
  private bannerQueue: { title: string; sub: string; color: string }[] = [];
  private bannerBusy = false;
  private bumpAt = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.className = 'hidden';
    this.root.innerHTML = `
      <div class="hud-left">
        <div id="hud-timer" class="hud-box">00:30</div>
        <div class="turbo-gauge" title="Turbo"><i></i></div>
        <div id="hud-combo"></div>
        <div id="hud-flash" class="hidden"></div>
      </div>
      <button id="hud-pause" aria-label="Pausar">II</button>
      <div id="hud-boss" class="hidden"></div>
      <div id="hud-stats" class="hud-box">
        <span class="coins">$0</span>
        <span><span class="caps">0</span> <span class="lbl">capturas</span></span>
        <span><span class="depth">0 m</span> <span class="rec"></span></span>
      </div>
      <div id="hud-quota" class="hud-box"><span class="q-lbl">COTA</span><div class="q-bar"><i></i></div><span class="q-txt"></span></div>
      <div id="hud-bait" class="hud-box"><i class="dot"></i><span class="b-txt"></span><span class="keys">E jogar · Q trocar</span></div>
      <div id="hud-banner"></div>`;
    parent.appendChild(this.root);
    const q = (s: string) => this.root.querySelector(s) as HTMLElement;
    this.timer = q('#hud-timer');
    this.combo = q('#hud-combo');
    this.coinsEl = q('.coins');
    this.caps = q('.caps');
    this.depth = q('.depth');
    this.rec = q('.rec');
    this.turboBar = q('.turbo-gauge i');
    this.bossBox = q('#hud-boss');
    this.bannerEl = q('#hud-banner');
    this.pauseBtn = q('#hud-pause') as HTMLButtonElement;
    this.quotaBox = q('#hud-quota');
    this.quotaBar = q('#hud-quota .q-bar i');
    this.quotaTxt = q('#hud-quota .q-txt');
    this.baitDot = q('#hud-bait .dot');
    this.baitTxt = q('#hud-bait .b-txt');
    this.flashEl = q('#hud-flash');
  }

  show(v: boolean): void {
    this.root.classList.toggle('hidden', !v);
    if (v) this.prevTime = Infinity;
    else {
      this.bannerQueue = [];
      this.bannerEl.className = '';
    }
  }

  bumpCoins(): void {
    const now = performance.now();
    if (now - this.bumpAt < 90) return;
    this.bumpAt = now;
    this.coinsEl.classList.remove('bump');
    void this.coinsEl.offsetWidth;
    this.coinsEl.classList.add('bump');
  }

  /** Big announcement under the top bar (queued, one at a time). */
  banner(title: string, sub: string, color: string): void {
    this.bannerQueue.push({ title, sub, color });
    if (!this.bannerBusy) this.nextBanner();
  }

  private nextBanner(): void {
    const b = this.bannerQueue.shift();
    if (!b) {
      this.bannerBusy = false;
      return;
    }
    this.bannerBusy = true;
    this.bannerEl.innerHTML = `<b style="color:${b.color}">${b.title}</b>${b.sub ? `<span>${b.sub}</span>` : ''}`;
    this.bannerEl.className = '';
    void this.bannerEl.offsetWidth;
    this.bannerEl.className = 'on';
    setTimeout(() => {
      this.bannerEl.className = '';
      setTimeout(() => this.nextBanner(), 250);
    }, 2600);
  }

  update(h: RunHud): void {
    const now = performance.now();
    if (h.timeLeft > this.prevTime + 0.5) this.bonusUntil = now + 900;
    this.prevTime = h.timeLeft;
    const secs = Math.ceil(h.timeLeft);
    const t = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}${now < this.bonusUntil ? '+' : ''}`;
    if (t !== this.last.t) {
      this.last.t = t;
      this.timer.innerHTML = t.endsWith('+') ? `${t.slice(0, -1)}<span class="bonus">+s</span>` : t;
    }
    const warn = h.timeLeft <= CONFIG.run.warnSeconds;
    if (warn !== this.last.warn) {
      this.last.warn = warn;
      this.timer.classList.toggle('warn', warn);
    }
    if (h.coins !== this.last.c) {
      this.last.c = h.coins;
      this.coinsEl.textContent = `$${formatCoins(h.coins)}`;
    }
    if (h.captures !== this.last.n) {
      this.last.n = h.captures;
      this.caps.textContent = String(h.captures);
    }
    const d = Math.round(h.depth);
    if (d !== this.last.d) {
      this.last.d = d;
      this.depth.textContent = `${d.toLocaleString('pt-BR')} m`;
    }
    const r = Math.round(h.bestDepth);
    if (r !== this.last.r) {
      this.last.r = r;
      this.rec.textContent = `rec. ${r.toLocaleString('pt-BR')} m`;
    }
    const k = h.frenzy > 0 ? `F${Math.ceil(h.frenzy * 20)}` : h.combo >= 2 ? `C${h.combo}` : '';
    if (k !== this.last.k) {
      this.last.k = k;
      if (h.frenzy > 0) this.combo.innerHTML = `<span class="frenzy">FRENESI!</span><i style="width:${Math.round(h.frenzy * 100)}%"></i>`;
      else this.combo.textContent = h.combo >= 2 ? `COMBO x${h.combo}${h.combo >= CONFIG.frenzy.combo - 2 ? ' !' : ''}` : '';
    }
    const tb = Math.round(h.turbo * 50);
    if (tb !== this.last.turbo) {
      this.last.turbo = tb;
      this.turboBar.style.width = `${tb * 2}%`;
    }
    const qk = `${h.quota.kg.toFixed(1)}|${h.quota.target}|${h.quota.divesLeft}`;
    if (qk !== this.last.q) {
      this.last.q = qk;
      const pct = Math.min(100, (h.quota.kg / h.quota.target) * 100);
      this.quotaBar.style.width = `${pct}%`;
      this.quotaBox.classList.toggle('met', pct >= 100);
      this.quotaTxt.textContent = `${h.quota.kg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/${h.quota.target} kg · ${h.quota.divesLeft === 1 ? 'último mergulho' : `${h.quota.divesLeft} mergulhos`}`;
    }
    const bk2 = `${h.bait.name}|${h.bait.count}`;
    if (bk2 !== this.last.b) {
      this.last.b = bk2;
      this.baitDot.style.background = h.bait.color;
      this.baitTxt.textContent = `${h.bait.name} ×${h.bait.count}`;
      this.onBait(h.bait.name, h.bait.count, h.bait.color);
    }
    const fk = h.flash ? `${h.flash.name}|${h.flash.got}|${h.flash.need}|${Math.ceil(h.flash.t)}` : '';
    if (fk !== this.last.f) {
      this.last.f = fk;
      this.flashEl.classList.toggle('hidden', !h.flash);
      if (h.flash) this.flashEl.innerHTML = `<b>PEDIDO</b> ${h.flash.got}/${h.flash.need} ${h.flash.name} <span>${Math.ceil(h.flash.t)}s</span>`;
    }
    if (h.tide !== this.last.tide) {
      this.last.tide = h.tide;
      this.timer.classList.toggle('tide', h.tide);
    }
    const bk = h.boss ? `${h.boss.name}|${h.boss.hp}|${h.boss.open}|${h.boss.hearts}` : '';
    if (bk !== this.last.boss) {
      this.last.boss = bk;
      this.bossBox.classList.toggle('hidden', !h.boss);
      if (h.boss) {
        const pips = Array.from({ length: h.boss.max }, (_, i) => `<i class="${i < h.boss!.max - h.boss!.hp ? 'done' : ''}"></i>`).join('');
        const hearts = Array.from({ length: h.boss.maxHearts }, (_, i) => `<em class="${i < h.boss!.hearts ? '' : 'lost'}">♥</em>`).join('');
        this.bossBox.innerHTML = `<b>${h.boss.name.toUpperCase()}</b><div class="pips">${pips}</div><div class="hearts">GARRA ${hearts}</div><span class="${h.boss.open ? 'open' : ''}">${h.boss.open ? 'PONTO FRACO ABERTO!' : 'protegido…'}</span>`;
      }
    }
  }
}

export class TouchControls {
  readonly root: HTMLElement;
  readonly left: HTMLButtonElement;
  readonly right: HTMLButtonElement;
  readonly turbo: HTMLButtonElement;
  readonly strike: HTMLButtonElement;
  readonly bait: HTMLButtonElement;
  readonly cycle: HTMLButtonElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'touch';
    this.root.className = 'hidden';
    this.root.innerHTML = `
      <button id="t-left" aria-label="Esquerda">◀</button>
      <button id="t-right" aria-label="Direita">▶</button>
      <button id="t-turbo" aria-label="Turbo">TURBO</button>
      <button id="t-bait" aria-label="Jogar isca"><i class="dot"></i><span>ISCA</span><b>×0</b></button>
      <button id="t-cycle" aria-label="Trocar isca">⇄</button>
      <button id="t-strike">CAPTURAR</button>`;
    parent.appendChild(this.root);
    this.left = this.root.querySelector('#t-left')!;
    this.right = this.root.querySelector('#t-right')!;
    this.turbo = this.root.querySelector('#t-turbo')!;
    this.strike = this.root.querySelector('#t-strike')!;
    this.bait = this.root.querySelector('#t-bait')!;
    this.cycle = this.root.querySelector('#t-cycle')!;
  }

  setBait(name: string, count: number, color: string): void {
    (this.bait.querySelector('.dot') as HTMLElement).style.background = color;
    this.bait.querySelector('b')!.textContent = `×${count}`;
    this.bait.title = name;
    this.bait.classList.toggle('empty', count <= 0);
  }

  show(v: boolean): void {
    this.root.classList.toggle('hidden', !v);
  }
}
