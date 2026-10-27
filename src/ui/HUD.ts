import { CONFIG } from '../config';
import type { RunHud } from '../core/Game';
import { formatCoins } from '../systems/Economy';

/** Compact in-run HUD (DOM). Only touches the DOM when values change. */
export class HUD {
  readonly root: HTMLElement;
  private timer: HTMLElement;
  private combo: HTMLElement;
  private coins: HTMLElement;
  private caps: HTMLElement;
  private depth: HTMLElement;
  private rec: HTMLElement;
  readonly pauseBtn: HTMLButtonElement;
  private last = { t: '', c: -1, n: -1, d: -1, r: -1, k: -1, warn: false };
  private prevTime = 0;
  private bonusUntil = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.className = 'hidden';
    this.root.innerHTML = `
      <div id="hud-timer" class="hud-box">00:30</div>
      <div id="hud-combo"></div>
      <button id="hud-pause" aria-label="Pausar">II</button>
      <div id="hud-stats" class="hud-box">
        <span class="coins">$0</span>
        <span><span class="caps">0</span> <span class="lbl">capturas</span></span>
        <span><span class="depth">0 m</span> <span class="rec"></span></span>
      </div>`;
    parent.appendChild(this.root);
    const q = (s: string) => this.root.querySelector(s) as HTMLElement;
    this.timer = q('#hud-timer');
    this.combo = q('#hud-combo');
    this.coins = q('.coins');
    this.caps = q('.caps');
    this.depth = q('.depth');
    this.rec = q('.rec');
    this.pauseBtn = q('#hud-pause') as HTMLButtonElement;
  }

  show(v: boolean): void {
    this.root.classList.toggle('hidden', !v);
    if (v) this.prevTime = Infinity;
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
      this.coins.textContent = `$${formatCoins(h.coins)}`;
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
    if (h.combo !== this.last.k) {
      this.last.k = h.combo;
      this.combo.textContent = h.combo >= 2 ? `COMBO x${h.combo}` : '';
    }
  }
}

export class TouchControls {
  readonly root: HTMLElement;
  readonly left: HTMLButtonElement;
  readonly right: HTMLButtonElement;
  readonly strike: HTMLButtonElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'touch';
    this.root.className = 'hidden';
    this.root.innerHTML = `
      <button id="t-left" aria-label="Esquerda">◀</button>
      <button id="t-right" aria-label="Direita">▶</button>
      <button id="t-strike">CAPTURAR</button>`;
    parent.appendChild(this.root);
    this.left = this.root.querySelector('#t-left')!;
    this.right = this.root.querySelector('#t-right')!;
    this.strike = this.root.querySelector('#t-strike')!;
  }

  show(v: boolean): void {
    this.root.classList.toggle('hidden', !v);
  }
}
