import { describe, expect, it } from 'vitest';
import { SAVE_KEY, defaultSave, loadSave, sanitizeSave, writeSave, type KV } from '../src/core/Save';

function memKV(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe('save', () => {
  it('round-trips', () => {
    const kv = memKV();
    const s = defaultSave();
    s.coins = 321;
    s.upgrades.runTime = 2;
    s.ownedClaws.push('lightning');
    s.equippedClaw = 'lightning';
    s.bestDepth = 140.5;
    s.species.star = { caught: 3, variants: ['normal', 'golden'] };
    writeSave(s, kv);
    expect(loadSave(kv)).toEqual(s);
  });

  it('recovers from corrupt JSON and garbage values', () => {
    const kv = memKV();
    kv.setItem(SAVE_KEY, '{not json');
    expect(loadSave(kv)).toEqual(defaultSave());
    const s = sanitizeSave({
      coins: -50, bestDepth: 'deep', upgrades: { runTime: 2.7, luck: -3, bogus: Number.NaN },
      ownedClaws: ['nope', 'hydraulic', 7], equippedClaw: 'nope',
      species: { star: { caught: 2, variants: ['golden', 'weird'] }, fakeFish: { caught: 9 } },
    });
    expect(s.coins).toBe(0);
    expect(s.bestDepth).toBe(0);
    expect(s.upgrades).toEqual({ runTime: 2 });
    expect(s.ownedClaws).toEqual(['scrap', 'hydraulic']);
    expect(s.equippedClaw).toBe('scrap');
    expect(s.species).toEqual({ star: { caught: 2, variants: ['golden'] } });
  });

  it('handles missing storage', () => {
    expect(loadSave(null)).toEqual(defaultSave());
    expect(() => writeSave(defaultSave(), null)).not.toThrow();
  });
});
