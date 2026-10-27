import './styles.css';
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

game.input.bindHoldButton(touch.left, 'left');
game.input.bindHoldButton(touch.right, 'right');
game.input.bindStrikeButton(touch.strike);
hud.pauseBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  game.pause();
});

const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
if (coarse) game.input.touchMode = true;
game.input.onTouchMode = () => touch.show(game.mode === 'playing');
game.input.onPause = () => game.togglePause();

game.onModeChange = (m) => {
  const playing = m === 'playing';
  hud.show(playing || m === 'paused');
  touch.show(playing && game.input.touchMode);
  document.body.classList.toggle('menu', !playing);
  if (m === 'paused') screens.showPause();
  if (playing) screens.clear();
};
game.onHud = (h) => hud.update(h);
game.onRunEnd = (s) => screens.showResults(s);

// ───────────── layout: fit a 16:9 stage inside the safe viewport
function layout(): void {
  const r = app.getBoundingClientRect();
  const cs = getComputedStyle(app);
  const w = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  let sw = w;
  let sh = (w * 9) / 16;
  if (sh > h) {
    sh = h;
    sw = (h * 16) / 9;
  }
  sw = Math.floor(sw);
  sh = Math.floor(sh);
  stage.style.width = `${sw}px`;
  stage.style.height = `${sh}px`;
  stage.style.setProperty('--u', `${sh / 100}px`);
  game.renderer.resize(sw, sh, Math.min(3, window.devicePixelRatio || 1));
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
  if (!(e.target as HTMLElement).closest('.panel-body, .results')) e.preventDefault();
}, { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault());

screens.showBase();
document.body.classList.add('menu');
game.start();

const params = new URLSearchParams(location.search);
if (import.meta.env.DEV || params.has('test')) (window as unknown as { __abyss: Game }).__abyss = game;
