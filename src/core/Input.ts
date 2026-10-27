import { VIEW_H, VIEW_W } from '../config';

/**
 * Mouse/keyboard + multitouch input. Aim is in internal view coordinates.
 * Touch on the sea moves the aim only; the CAPTURAR button strikes.
 */
export class Input {
  aimX = VIEW_W / 2;
  aimY = VIEW_H * 0.6;
  touchMode = false;
  private keys = new Set<string>();
  private strikeQueued = false;
  private btnLeft = false;
  private btnRight = false;
  private btnTurbo = false;
  private aimPointer = -1;
  onPause: () => void = () => {};
  onFirstGesture: () => void = () => {};
  onTouchMode: () => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.btnLeft = this.btnRight = this.btnTurbo = false;
    });
  }

  bindHoldButton(el: HTMLElement, which: 'left' | 'right' | 'turbo'): void {
    const set = (v: boolean) => {
      if (which === 'left') this.btnLeft = v;
      else if (which === 'right') this.btnRight = v;
      else this.btnTurbo = v;
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.gesture(e);
      el.setPointerCapture?.(e.pointerId);
      set(true);
      el.classList.add('held');
    });
    const release = () => {
      set(false);
      el.classList.remove('held');
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
  }

  bindStrikeButton(el: HTMLElement): void {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.gesture(e);
      this.strikeQueued = true;
      el.classList.add('held');
    });
    const release = () => el.classList.remove('held');
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  }

  private gesture(e: PointerEvent) {
    this.onFirstGesture();
    if (e.pointerType === 'touch' && !this.touchMode) {
      this.touchMode = true;
      this.onTouchMode();
    }
  }

  private toView(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * VIEW_W;
    const y = ((e.clientY - r.top) / r.height) * VIEW_H;
    this.aimX = Math.max(2, Math.min(VIEW_W - 2, x));
    this.aimY = Math.max(30, Math.min(VIEW_H - 4, y));
  }

  private down = (e: PointerEvent) => {
    e.preventDefault();
    this.gesture(e);
    if (e.pointerType === 'touch' || (e.pointerType === 'pen' && this.touchMode)) {
      this.aimPointer = e.pointerId;
      this.toView(e);
      return;
    }
    this.toView(e);
    if (e.button === 0) this.strikeQueued = true;
  };

  private move = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      if (e.pointerId === this.aimPointer) this.toView(e);
      return;
    }
    this.toView(e);
  };

  private up = (e: PointerEvent) => {
    // aim stays where the finger left it
    if (e.pointerId === this.aimPointer) this.aimPointer = -1;
  };

  private keydown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    this.onFirstGesture();
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) this.strikeQueued = true;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') this.onPause();
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    this.keys.add(e.code);
  };

  /** -1 left, 1 right, 0 none. */
  dir(): number {
    const l = this.btnLeft || this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const r = this.btnRight || this.keys.has('KeyD') || this.keys.has('ArrowRight');
    return (r ? 1 : 0) - (l ? 1 : 0);
  }

  turbo(): boolean {
    return this.btnTurbo || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  consumeStrike(): boolean {
    const s = this.strikeQueued;
    this.strikeQueued = false;
    return s;
  }

  reset(): void {
    this.strikeQueued = false;
    this.keys.clear();
    this.btnLeft = this.btnRight = this.btnTurbo = false;
  }
}
