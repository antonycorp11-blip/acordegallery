import type { SaveData } from '../core/Save';
import { SPECIES, isCreature } from '../entities/Species';
import { mixColor } from '../render/Color';
import { creatureSprite, drawEel, makeCanvas, variantPalette } from '../render/PixelArt';

const W = 260;
const H = 120;

interface Swimmer {
  id: string;
  x: number;
  y: number;
  speed: number;
  phase: number;
  dir: number;
}

/** Animated pixel tank with one of each discovered species. Stops when detached. */
export function mountAquariumTank(host: HTMLElement, save: SaveData): void {
  const canvas = makeCanvas(W, H);
  canvas.className = 'tank';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const found = SPECIES.filter((s) => isCreature(s) && (save.species[s.id]?.caught ?? 0) > 0);
  const swimmers: Swimmer[] = found.map((s, i) => ({
    id: s.id,
    x: Math.random() * W,
    y: 0,
    speed: 8 + Math.random() * 14,
    phase: Math.random() * 6,
    dir: i % 2 ? 1 : -1,
  }));
  const bubbles = Array.from({ length: 14 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 6 + Math.random() * 10 }));
  let last = performance.now();
  let t = 0;
  const frame = (now: number) => {
    if (!canvas.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    // water + sand + plants
    for (let y = 0; y < H; y += 4) {
      ctx.fillStyle = mixColor('#3fd6d8', '#1a6a9a', y / H);
      ctx.fillRect(0, y, W, 4);
    }
    ctx.fillStyle = '#e0b562';
    ctx.fillRect(0, H - 12, W, 12);
    ctx.fillStyle = '#f6dc8f';
    ctx.fillRect(0, H - 12, W, 1);
    for (let x = 0; x < W; x += 2) if ((x * 7) % 11 === 0) { ctx.fillStyle = '#b98a45'; ctx.fillRect(x, H - 8 + (x % 5), 1, 1); }
    for (let k = 0; k < 6; k++) {
      const bx = 18 + k * 44;
      for (let i = 0; i < 22 + (k % 3) * 8; i++) {
        ctx.fillStyle = i % 5 ? '#8be33a' : '#4f9a2a';
        ctx.fillRect(bx + Math.round(Math.sin(t * 1.5 + k + i * 0.2) * (i / 30) * 3), H - 12 - i, 2, 1);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (const b of bubbles) {
      b.y -= b.s * dt;
      if (b.y < 0) { b.y = H - 12; b.x = Math.random() * W; }
      ctx.fillRect(Math.round(b.x + Math.sin(t * 2 + b.s) * 2), Math.round(b.y), 1, 1);
    }
    swimmers.forEach((s, i) => {
      const def = found[i];
      const floor = def.behavior === 'crawler' || def.behavior === 'sessile' || def.behavior === 'burrower' || def.behavior === 'mimic';
      s.x += s.dir * s.speed * dt * (floor ? 0.4 : 1);
      if (s.x < 10) s.dir = 1;
      if (s.x > W - 10) s.dir = -1;
      const w = Math.min(28, def.size.w);
      const h = Math.min(18, def.size.h);
      s.y = floor ? H - 12 - h / 2 : 20 + ((i * 23) % (H - 50)) + Math.sin(t * 1.2 + s.phase) * 4;
      if (def.shapeParts === 'eel') {
        drawEel(ctx, Math.round(s.x), Math.round(s.y), w, h, s.dir, t * 6 + s.phase, variantPalette(def, 'normal'));
        return;
      }
      const spr = creatureSprite(def, 'normal', w, h, Math.floor(t * 4 + s.phase) % 4);
      const dx = Math.round(s.x - spr.width / 2);
      const dy = Math.round(s.y - spr.height / 2);
      if (s.dir < 0 && def.shapeParts !== 'crab' && def.shapeParts !== 'star' && def.shapeParts !== 'chest') {
        ctx.save();
        ctx.translate(dx + spr.width, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(spr, 0, 0);
        ctx.restore();
      } else ctx.drawImage(spr, dx, dy);
    });
    if (!swimmers.length) {
      ctx.fillStyle = 'rgba(6,19,31,0.7)';
      ctx.fillRect(40, 44, W - 80, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Capture bichos para enchê-lo!', W / 2, 59);
    }
    // glass shine
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(6, 4, 2, H - 20);
    ctx.fillRect(10, 4, 1, H - 30);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
