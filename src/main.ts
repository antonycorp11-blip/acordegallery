import './styles.css';
import { HuntPanel } from './ui/HuntPanel';
import { version } from '../package.json';
import { setViewAspect, VIEW_H, VIEW_MAX_W, VIEW_MIN_W } from './config';
import { Game } from './core/Game';
import { HUD, TouchControls } from './ui/HUD';
import { Screens } from './ui/Screens';

const app = document.getElementById('app')!;
app.innerHTML = `
  <div id="stage">
    <canvas id="game" aria-label="Abyss Claw"></canvas>
    <div id="screen"></div>
  </div>
  <div id="rotate"><div class="phone"></div><div>Gire o aparelho para jogar na horizontal</div></div>`;

const stage = document.getElementById('stage')!;
const canvas = document.getElementById('game') as HTMLCanvasElement;
const screenEl = document.getElementById('screen')!;

const game = new Game(canvas);
const hud = new HUD(stage);
const touch = new TouchControls(stage);
stage.insertBefore(hud.root, screenEl);
stage.insertBefore(touch.root, screenEl);
const screens = new Screens(screenEl, game);
const hunt = new HuntPanel(game, stage);
const versionEl = document.createElement('div');
versionEl.className = 'game-version';
versionEl.textContent = `v${version} · Biomas`;
stage.append(versionEl);

game.input.bindHoldButton(touch.left, 'left');
game.input.bindHoldButton(touch.right, 'right');
game.input.bindHoldButton(touch.turbo, 'turbo');
game.input.bindStrikeButton(touch.strike);
game.input.bindTapButton(touch.bait, 'bait');
game.input.bindTapButton(touch.cycle, 'cycle');
hud.onBait = (name, count, color) => touch.setBait(name, count, color);
hud.pauseBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  game.pause();
});

const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
if (coarse) game.input.touchMode = true;
game.input.onTouchMode = () => { touch.show(game.mode === 'playing'); document.body.classList.add('touch'); };
game.input.onPause = () => game.togglePause();

game.onModeChange = (m) => {
  const playing = m === 'playing';
  hud.show(playing || m === 'paused');
  hunt.show(playing);
  touch.show(playing && game.input.touchMode);
  document.body.classList.toggle('touch', game.input.touchMode);
  document.body.classList.toggle('menu', !playing);
  if (m === 'paused') screens.showPause();
  if (playing) {
    screens.clear();
    updateCoinTarget();
  }
};
game.onHud = (h) => { hud.update(h); hunt.update(h); };
game.onBanner = (title, sub, color) => hud.banner(title, sub, color);
game.onRunEnd = (s) => screens.showResults(s);
game.renderer.onCoinLanded = () => hud.bumpCoins();

/** Flying coins land on the HUD money counter. */
function updateCoinTarget(): void {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const sr = stage.getBoundingClientRect();
  const cr = hud.coinsEl.getBoundingClientRect();
  if (!cr.width) return;
  game.renderer.coinTarget = { x: (cr.left - sr.left + cr.width / 2) * dpr, y: (cr.top - sr.top + cr.height / 2) * dpr };
}

// ───────────── layout: fill the whole screen; the internal width follows the aspect
function layout(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const viewW = setViewAspect(w / h);
  let sw = w;
  let sh = h;
  // beyond the supported aspect range, keep pixels square and center the stage
  const aspect = viewW / VIEW_H;
  if (w / h > VIEW_MAX_W / VIEW_H) sw = Math.round(h * aspect);
  else if (w / h < VIEW_MIN_W / VIEW_H) sh = Math.round(w / aspect);
  stage.style.width = `${sw}px`;
  stage.style.height = `${sh}px`;
  stage.style.setProperty('--u', `${Math.min(sh, sw * 0.5625) / 100}px`);
  game.renderer.resize(sw, sh, Math.min(3, window.devicePixelRatio || 1));
  requestAnimationFrame(updateCoinTarget);
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 150));
window.visualViewport?.addEventListener('resize', layout);
layout();

// never drain the clock while the player can't play
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pause();
});
window.addEventListener('blur', () => game.pause());
const portrait = window.matchMedia?.('(orientation: portrait) and (pointer: coarse)');
portrait?.addEventListener?.('change', (e) => {
  if (e.matches) game.pause();
});

// block pinch-zoom / double-tap zoom / page scroll on the play field
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => {
  if (!(e.target as HTMLElement).closest('.panel-body, .results, .scroll')) e.preventDefault();
}, { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault());

screens.showBase();
document.body.classList.add('menu');
game.start();

const params = new URLSearchParams(location.search);
if (import.meta.env.DEV || params.has('test')) (window as unknown as { __abyss: Game }).__abyss = game;
