import type { Game } from '../core/Game';
import { BOSSES_BY_ID } from '../entities/Boss';
import { formatCoins } from '../systems/Economy';
import {
  BRANCH_COLOR, BRANCH_LABEL, UPGRADES_BY_ID, buyUpgrade, canBuy, computeStats, level, nodeVisibility, treeNodes, upgradeCost,
  type NodeVisibility, type StatKey, type TreeId, type UpgradeDef,
} from '../systems/Upgrades';

// 8×8 pixel icons drawn by code: '#' = branch color, '+' = white, '.' = empty.
const ICONS: Record<StatKey | 'core', string[]> = {
  grip: ['##....##','###..###','.######.','..####..','...##...','...##...','..####..','........'],
  tools: ['...##...','..####..','.######.','...##...','...##...','...##...','...##...','...##...'],
  dual: ['##....##','##....##','##....##','##....##','.##..##.','..#..#..','........','........'],
  core: ['..####..', '...##...', '..####..', '.#.##.#.', '#..##..#', '#......#', '.#....#.', '..#..#..'],
  runTime: ['..####..', '.#....#.', '#...+..#', '#...+..#', '#..++..#', '#......#', '.#....#.', '..####..'],
  strikeSpeed: ['....##..', '...##...', '..##....', '.######.', '....##..', '...##...', '..##....', '.##.....'],
  recovery: ['..####..', '.#....#.', '#.....##', '#....###', '###....#', '##.....#', '.#....#.', '..####..'],
  opening: ['#......#', '#......#', '.#....#.', '.#....#.', '..#..#..', '..####..', '...++...', '...++...'],
  strength: ['........', '##....##', '##....##', '########', '########', '##....##', '##....##', '........'],
  precision: ['...##...', '...##...', '..#..#..', '###++###', '###++###', '..#..#..', '...##...', '...##...'],
  multi: ['........', '.##..##.', '.#+..#+.', '........', '...##...', '...#+...', '........', '........'],
  lateral: ['....#...', '....##..', '#######.', '########', '#######.', '....##..', '....#...', '........'],
  timeBonus: ['..#..#..', '..####..', '.######.', '##.++.##', '##.++.##', '.######.', '..####..', '..#..#..'],
  density: ['........', '#...###.', '##.##+##', '#######.', '##.#####', '#...###.', '........', '........'],
  luck: ['...##...', '...##...', '########', '.##++##.', '..####..', '.##..##.', '##....##', '........'],
  schools: ['#.##....', '####....', '#.##.#.#', '.....###', '#.##.#.#', '####....', '#.##....', '........'],
  variants: ['...##...', '..####..', '.##++##.', '##++++##', '.##++##.', '..####..', '...##...', '........'],
  combo: ['##....##', '.##..##.', '..####..', '...++...', '..####..', '.##..##.', '##....##', '........'],
  perfect: ['..####..', '.#....#.', '#..##..#', '#.#++#.#', '#.#++#.#', '#..##..#', '.#....#.', '..####..'],
  sonar: ['#.......', '.#..#...', '.#...#..', '.#.#..#.', '.#.#..#.', '.#...#..', '.#..#...', '#.......'],
  value: ['...##...', '..####..', '.##+.##.', '.##..##.', '..##....', '....##..', '.##+.##.', '..####..'],
  frenzy: ['.#...#..', '.##..##.', '.###.###', '########', '.######.', '..####..', '...##...', '........'],
  aquarium: ['########', '#......#', '#.##...#', '#####..#', '#.##..+#', '#.....+#', '#~~~~~~#', '########'],
  clawDiscount: ['#.....#.', '#.....#.', '.#...#..', '.#####..', '...#....', '..###...', '.#+#+#..', '..###...'],
  keepRoutes: ['....##..', '...#..#.', '...#..#.', '....##..', '...#....', '..#.....', '.#......', '#.......'],
  stealth: ['........', '..####..', '.#....#.', '#..++..#', '#..++..#', '.#....#.', '..####..', '#.#.#.#.'],
  hull: ['.######.', '#++++++#', '#+####+#', '#+#..#+#', '#+#..#+#', '.#+##+#.', '..#++#..', '...##...'],
  kg: ['...##...', '..#..#..', '.######.', '#......#', '#.#..#.#', '#..##..#', '#......#', '########'],
  baitTime: ['...#....', '...#....', '...#....', '..###...', '.#.#.#..', '.#...#..', '..#.#+..', '...#....'],
  cable: ['########', '...##...', '...#....', '...#....', '...#....', '..###...', '.#.#.#..', '.#...#..'],
  autoClaw: ['#.#..#.#', '#.#..#.#', '#.#..#.#', '###..###', '.#....#.', '#+#..#+#', '#.#..#.#', '........'],
  autoSpeed: ['..###...', '.#...#..', '#..#..#.', '#..##.#.', '#.....#.', '.#...#..', '..###...', '........'],
  turbo: ['#...#...', '##..##..', '###.###.', '########', '###.###.', '##..##..', '#...#...', '........'],
};

const iconCache = new Map<string, string>();
export function iconUrl(key: StatKey | 'core', color: string): string {
  const k = key + color;
  let url = iconCache.get(k);
  if (url) return url;
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const ctx = c.getContext('2d')!;
  ICONS[key].forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = ch === '+' ? '#ffffff' : color;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  url = c.toDataURL();
  iconCache.set(k, url);
  return url;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** Pan/zoom survive re-renders and tab switches (one per tree). */
const views: Record<TreeId, { x: number; y: number; zoom: number; centered: boolean; selected: string }> = {
  main: { x: 0, y: 0, zoom: 1, centered: false, selected: '' },
  essence: { x: 0, y: 0, zoom: 1, centered: false, selected: '' },
};

/**
 * Incremental-game style skill tree: square nodes on a pannable map.
 * Buying a node reveals its children; the next ring shows as "?".
 */
export class SkillTree {
  private world!: HTMLElement;
  private info!: HTMLElement;
  private pointers = new Map<number, { x: number; y: number }>();
  private dragMoved = false;
  private downNode: string | null = null;
  private pinchDist = 0;
  private justRevealed = new Set<string>();

  private readonly nodes: UpgradeDef[];
  private readonly money: (n: number) => string;

  constructor(private root: HTMLElement, private game: Game, private onChange: () => void, private tree: TreeId = 'main') {
    this.nodes = treeNodes(tree);
    this.money = tree === 'essence' ? (n) => `✦${n}` : (n) => `$${formatCoins(n)}`;
    root.classList.add('tree-view');
    root.innerHTML = `
      <div class="tree-world"></div>
      <div class="tree-pop hidden"></div>
      <div class="tree-jumps"><button data-jump="x_cable1">GUINCHO</button><button data-jump="c_str">FORÇA</button><button data-jump="g_density">VIDA</button><button data-jump="t_auto">AUTOMÁTICAS</button></div>
      <div class="tree-tools">
        <button class="tree-btn" data-z="1" aria-label="Aproximar">+</button>
        <button class="tree-btn" data-z="-1" aria-label="Afastar">−</button>
        <button class="tree-btn" data-z="0" aria-label="Centralizar">◎</button>
      </div>
      <div class="tree-hint">Toque num nó para ver o que ele faz · toque de novo (ou em Comprar) para comprar · arraste para mover</div>`;
    this.world = root.querySelector('.tree-world')!;
    this.info = root.querySelector('.tree-pop')!;
    root.querySelectorAll<HTMLElement>('.tree-btn').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const z = Number(b.dataset.z);
        if (z === 0) this.center();
        else this.zoomAt(z > 0 ? 1.2 : 1 / 1.2, root.clientWidth / 2, root.clientHeight / 2);
      }),
    );
    if (tree === 'essence') root.querySelector('.tree-jumps')?.remove();
    root.querySelectorAll<HTMLElement>('[data-jump]').forEach(button => button.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      const id = button.dataset.jump!;
      const u = UPGRADES_BY_ID[id];
      this.view.zoom = 1;
      this.view.x = (root.clientWidth || 600) / 2 - u.x * this.G;
      this.view.y = (root.clientHeight || 300) / 2 - u.y * this.G;
      this.view.selected = id;
      this.render();
      this.applyTransform();
    }));
    root.addEventListener('pointerdown', this.onDown);
    root.addEventListener('pointermove', this.onMove);
    root.addEventListener('pointerup', this.onUp);
    root.addEventListener('pointercancel', this.onUp);
    root.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = root.getBoundingClientRect();
      this.zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    this.render();
    if (!this.view.centered) this.center();
    else this.applyTransform();
  }

  private get view() {
    return views[this.tree];
  }

  /** Grid spacing in px, proportional to the stage size. */
  private get G(): number {
    const u = parseFloat(getComputedStyle(this.root).getPropertyValue('--u')) || 4;
    return u * 17;
  }

  private center(): void {
    const w = this.root.clientWidth || 600;
    const h = this.root.clientHeight || 300;
    // frame what the player can currently see
    const vis = this.nodes.filter((u) => nodeVisibility(this.game.save, u.id) !== 'hidden');
    const G = this.G;
    const xs = vis.map((u) => u.x * G);
    const ys = vis.map((u) => u.y * G);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const spanX = Math.max(...xs) - Math.min(...xs) + G * 2;
    const spanY = Math.max(...ys) - Math.min(...ys) + G * 2;
    this.view.zoom = Math.max(0.55, Math.min(1.4, Math.min((w * 0.85) / spanX, (h * 0.8) / spanY)));
    this.view.x = w / 2 - cx * this.view.zoom;
    this.view.y = h / 2 - cy * this.view.zoom;
    this.view.centered = true;
    this.applyTransform();
  }

  private applyTransform(): void {
    this.world.style.transform = `translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.zoom})`;
    this.positionPop();
  }

  /** The detail balloon sits beside the selected node, inside the screen. */
  private positionPop(): void {
    const u = UPGRADES_BY_ID[this.view.selected];
    if (!u || this.info.classList.contains('hidden')) return;
    const G = this.G;
    const half = G * 0.34 * this.view.zoom;
    const sx = this.view.x + u.x * G * this.view.zoom;
    const sy = this.view.y + u.y * G * this.view.zoom;
    const W = this.root.clientWidth;
    const H = this.root.clientHeight;
    const pw = this.info.offsetWidth;
    const ph = this.info.offsetHeight;
    let left = sx + half + 14;
    if (left + pw > W - 8) left = sx - half - 14 - pw;
    if (left < 8) left = Math.max(8, Math.min(W - pw - 8, sx - pw / 2));
    let top = sy - ph / 2;
    top = Math.max(8, Math.min(H - ph - 8, top));
    this.info.style.left = `${Math.round(left)}px`;
    this.info.style.top = `${Math.round(top)}px`;
    this.info.classList.toggle('on-left', left < sx);
  }

  private zoomAt(f: number, px: number, py: number): void {
    const z = Math.max(0.45, Math.min(1.8, this.view.zoom * f));
    const k = z / this.view.zoom;
    this.view.x = px - (px - this.view.x) * k;
    this.view.y = py - (py - this.view.y) * k;
    this.view.zoom = z;
    this.applyTransform();
  }

  // ───────────────────────── input

  private onDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('.tree-pop, .tree-tools')) return;
    this.root.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.dragMoved = false;
    const node = (e.target as HTMLElement).closest('.node') as HTMLElement | null;
    this.downNode = this.pointers.size === 1 && node ? node.dataset.id! : null;
    if (this.pointers.size === 2) this.pinchDist = this.pinchSpan();
  };

  private onMove = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (this.pointers.size === 2) {
      p.x = e.clientX;
      p.y = e.clientY;
      const d = this.pinchSpan();
      if (this.pinchDist > 0 && d > 0) {
        const pts = [...this.pointers.values()];
        const r = this.root.getBoundingClientRect();
        this.zoomAt(d / this.pinchDist, (pts[0].x + pts[1].x) / 2 - r.left, (pts[0].y + pts[1].y) / 2 - r.top);
      }
      this.pinchDist = d;
      this.dragMoved = true;
      return;
    }
    if (!this.dragMoved && Math.hypot(dx, dy) < 6) return;
    this.dragMoved = true;
    p.x = e.clientX;
    p.y = e.clientY;
    this.view.x += dx;
    this.view.y += dy;
    this.applyTransform();
  };

  private onUp = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    if (!this.dragMoved && this.pointers.size === 0) {
      if (this.downNode) this.tapNode(this.downNode);
      else if (this.view.selected) {
        // tap on empty water closes the balloon
        this.view.selected = '';
        this.render();
      }
    }
    this.downNode = null;
  };

  private pinchSpan(): number {
    const pts = [...this.pointers.values()];
    return pts.length < 2 ? 0 : Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  private tapNode(id: string): void {
    this.game.audio.unlock();
    if (this.view.selected === id && nodeVisibility(this.game.save, id) !== 'teaser') {
      this.buy(id);
      return;
    }
    this.view.selected = id;
    this.game.audio.play('click');
    this.render();
  }

  private buy(id: string): void {
    const save = this.game.save;
    const before = new Set(this.nodes.filter((u) => nodeVisibility(save, u.id) === 'available').map((u) => u.id));
    const res = buyUpgrade(save, id);
    if (res !== 'ok') {
      this.root.querySelector(`.node[data-id="${id}"]`)?.classList.add('deny');
      setTimeout(() => this.root.querySelector(`.node[data-id="${id}"]`)?.classList.remove('deny'), 300);
      this.game.audio.play('miss');
      return;
    }
    this.game.persist();
    this.game.refreshStats();
    this.game.audio.play('buy');
    this.justRevealed = new Set(this.nodes.filter((u) => nodeVisibility(save, u.id) === 'available' && !before.has(u.id)).map((u) => u.id));
    if (this.justRevealed.size) setTimeout(() => this.game.audio.play('newSpecies'), 120);
    this.render(id);
    this.onChange();
  }

  // ───────────────────────── rendering

  render(boughtId?: string): void {
    const save = this.game.save;
    const G = this.G;
    const N = G * 0.68; // node size
    const vis = new Map<string, NodeVisibility>();
    for (const u of this.nodes) vis.set(u.id, nodeVisibility(save, u.id));

    let lines = '';
    for (const u of this.nodes) {
      if (!u.parent || vis.get(u.id) === 'hidden') continue;
      const p = UPGRADES_BY_ID[u.parent];
      const state = vis.get(u.id) === 'owned' ? 'on' : vis.get(u.id) === 'available' ? 'open' : 'dim';
      const color = state === 'dim' ? '#2a4a60' : BRANCH_COLOR[u.branch];
      lines += `<line class="${state}" x1="${p.x * G}" y1="${p.y * G}" x2="${u.x * G}" y2="${u.y * G}" stroke="${color}" />`;
    }

    let nodes = '';
    for (const u of this.nodes) {
      const v = vis.get(u.id)!;
      if (v === 'hidden') continue;
      const l = level(save, u.id);
      const res = canBuy(save, u.id);
      const color = BRANCH_COLOR[u.branch];
      const cls = [
        'node', v,
        l >= u.maxLevel ? 'maxed' : '',
        res === 'ok' ? 'can' : '',
        this.view.selected === u.id ? 'sel' : '',
        this.justRevealed.has(u.id) ? 'reveal' : '',
        boughtId === u.id ? 'pop' : '',
      ].join(' ');
      const sealed = v === 'teaser' && !!u.requiresBoss && !save.bosses.includes(u.requiresBoss);
      const inner = v === 'teaser'
        ? `<span class="q">${sealed ? '🔒' : '?'}</span>`
        : `<img src="${iconUrl(u.id === 'core' ? 'core' : u.stat, color)}" alt="" draggable="false">
           <span class="nl">${l}/${u.maxLevel}</span>`;
      nodes += `<div class="${cls}" data-id="${u.id}" style="left:${u.x * G - N / 2}px;top:${u.y * G - N / 2}px;width:${N}px;height:${N}px;--c:${color}">${inner}</div>`;
    }
    this.world.innerHTML = `<svg class="tree-lines" width="1" height="1">${lines}</svg>${nodes}`;
    this.justRevealed.clear();
    this.renderInfo();
  }

  private renderInfo(): void {
    const save = this.game.save;
    const u: UpgradeDef | undefined = UPGRADES_BY_ID[this.view.selected];
    if (!u) {
      this.info.classList.add('hidden');
      return;
    }
    this.info.classList.remove('hidden');
    const v = nodeVisibility(save, u.id);
    if (v === 'teaser' || v === 'hidden') {
      if (u.requiresPrestige && save.prestiges < u.requiresPrestige) {
        this.info.innerHTML = `<div class="ti-head"><b>${esc(u.name)}</b></div><p class="desc">🔒 Renasça ${u.requiresPrestige} vez(es). ${esc(u.description)}</p>`;
        this.positionPop(); return;
      }
      const boss = u.requiresBoss && !save.bosses.includes(u.requiresBoss) ? BOSSES_BY_ID[u.requiresBoss] : null;
      const parentOwned = level(save, u.parent!) >= 1;
      this.info.innerHTML = `<div class="ti-head"><b>${boss && parentOwned ? esc(u.name) : '???'}</b></div>
        <p class="desc">${boss && parentOwned
          ? `🔒 Selada. Liberada ao capturar o guardião <b>${esc(boss.name)}</b>.`
          : `Compre <b>${esc(UPGRADES_BY_ID[u.parent!].name)}</b> para revelar esta habilidade.`}</p>`;
      this.positionPop();
      return;
    }
    const l = level(save, u.id);
    const res = canBuy(save, u.id);
    const max = l >= u.maxLevel;
    const cost = upgradeCost(u, l);
    const color = BRANCH_COLOR[u.branch];
    let action: string;
    if (max) action = '<span class="equipped">NÍVEL MÁXIMO</span>';
    else if (res === 'locked') action = `<span class="lock">🔒 ${u.requiresPrestige && save.prestiges < u.requiresPrestige ? `Renasça ${u.requiresPrestige} vez(es)` : `Requer ${esc(UPGRADES_BY_ID[u.parent!].name)}`}</span>`;
    else action = `<button class="btn ${res === 'ok' ? 'buy-ok' : ''}" data-buy="${u.id}" ${res === 'ok' ? '' : 'disabled'}>Comprar ${this.money(cost)}</button>`;
    const kids = this.nodes.filter((k) => k.parent === u.id).length;
    // Show the equipped claw's actual total, including all other nodes and essence.
    const stats = computeStats(save);
    const next = computeStats({ ...save, upgrades: { ...save.upgrades, [u.id]: l + 1 } });
    const actualEffect = (st: typeof stats): string | null => {
      if (u.stat === 'lateral') return `Natação: ${st.lateralSpeed.toFixed(0)} px/s · turbo ${(st.lateralSpeed * 2).toFixed(0)} px/s`;
      if (u.stat === 'runTime') return `Mergulho: ${st.runSeconds}s (teto de 90s)`;
      if (u.stat === 'cable') return `Cabo: ${st.cable.toLocaleString('pt-BR')} m de alcance`;
      if (u.stat === 'autoClaw') return `${st.autoClaws} garra(s) automática(s)`;
      if (u.stat === 'autoSpeed') return `Garras automáticas: 1 ataque a cada ${st.autoCooldown.toFixed(2)}s`;
      if (u.stat === 'opening') return `Abertura: ${st.opening.toFixed(0)} px`;
      if (u.stat === 'value') return `Valor: ×${st.valueMult.toFixed(2)}`;
      if (u.stat === 'density') return `Bichos no mar: ×${st.density.toFixed(2)}`;
      if (u.stat === 'strength') return `Força total: ${st.strength.toFixed(2)}`;
      if (u.stat === 'strikeSpeed') return `Golpe: ${st.strikeMs.toFixed(1)} ms · recolhimento: ${st.retractMs.toFixed(1)} ms`;
      if (u.stat === 'recovery') return `Recarga: ${st.cooldownMs.toFixed(1)} ms`;
      return null;
    };
    const currentEffect = actualEffect(stats) ?? (l ? u.effect(l) : '—');
    const nextEffect = actualEffect(next) ?? u.effect(l + 1);
    this.info.innerHTML = `
      <div class="ti-head">
        <img src="${iconUrl(u.id === 'core' ? 'core' : u.stat, color)}" alt="">
        <div><b>${esc(u.name)}</b><span style="color:${color}">${BRANCH_LABEL[u.branch]} · nível ${l}/${u.maxLevel}</span></div>
      </div>
      <p class="desc">${esc(u.description)}</p>
      <p class="eff">Atual: ${esc(currentEffect)}${max ? '' : `<br><span class="next">Próximo: ${esc(nextEffect)}</span>`}</p>
      ${l === 0 && kids ? `<p class="unlock">Desbloqueia ${kids} nova(s) habilidade(s)</p>` : ''}
      ${action}`;
    this.info.querySelector<HTMLElement>('[data-buy]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.buy(u.id);
    });
    this.positionPop();
  }
}
