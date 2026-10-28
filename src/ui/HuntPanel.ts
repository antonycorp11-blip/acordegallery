import type { Game, RunHud } from '../core/Game';

/** Always-visible tool unlocks and a large touch-friendly skill check. */
export class HuntPanel {
  readonly root = document.createElement('div');
  private fight: HTMLElement;
  constructor(game: Game, parent: HTMLElement) {
    this.root.className = 'hunt-panel hidden';
    this.root.innerHTML = `
      <div class="hunt-tools"><button data-tool="net"></button><button data-tool="harpoon"></button><span class="hunt-rage"></span></div>
      <div class="hunt-fight hidden">
        <b class="hunt-name"></b><span class="hunt-progress"></span>
        <div class="hunt-track"><i class="hunt-green"></i><i class="hunt-marker"></i></div>
        <div class="hunt-tension"><i></i></div>
        <button class="btn primary" data-fish>FISGAR NO VERDE</button><small>Espere o marcador · erros rompem a linha · o tempo continua</small>
      </div>`;
    this.fight = this.root.querySelector('.hunt-fight')!;
    for (const button of this.root.querySelectorAll<HTMLElement>('[data-tool]')) {
      button.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation();
        game.queueTool(button.dataset.tool as 'net' | 'harpoon');
      });
    }
    this.root.querySelector('[data-fish]')!.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); game.tapFight();
    });
    window.addEventListener('keydown', e => {
      if(e.repeat || game.mode !== 'playing') return;
      if(e.code === 'KeyR') game.queueTool('net');
      if(e.code === 'KeyF') game.queueTool('harpoon');
    });
    parent.append(this.root);
  }
  show(show: boolean): void { this.root.classList.toggle('hidden', !show); }
  update(h: RunHud): void {
    for (const [id, required, cd, key] of [['net',1,h.tools.net,'R'],['harpoon',2,h.tools.harpoon,'F']] as const) {
      const button = this.root.querySelector<HTMLButtonElement>(`[data-tool="${id}"]`)!;
      const name = id === 'net' ? 'REDE' : 'ARPÃO';
      button.disabled = h.tools.prestige < required || cd > 0 || !!h.hunt;
      // locked tools stay out of the way until a rebirth unlocks them
      button.hidden = h.tools.prestige < required;
      button.textContent = h.tools.prestige < required ? `🔒 ${name} · renasça ${required}×` : cd > 0 ? `${name} · ${cd.toFixed(1)}s` : `${name} [${key}]`;
    }
    this.root.querySelector('.hunt-rage')!.textContent = 'Fúria · ' + h.rage;
    this.fight.classList.toggle('hidden', !h.hunt);
    if(!h.hunt) return;
    const f = h.hunt;
    this.root.querySelector('.hunt-name')!.textContent = 'DISPUTA · ' + f.name;
    this.root.querySelector('.hunt-progress')!.textContent = `${f.progress}/${f.target} acertos`;
    const green = this.root.querySelector<HTMLElement>('.hunt-green')!;
    green.style.left = (50 - f.window * 100) + '%';
    green.style.width = (f.window * 200) + '%';
    this.root.querySelector<HTMLElement>('.hunt-marker')!.style.left = f.marker * 100 + '%';
    this.root.querySelector<HTMLElement>('.hunt-tension i')!.style.width = f.tension * 100 + '%';
  }
}
