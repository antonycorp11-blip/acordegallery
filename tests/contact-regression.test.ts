import { expect, it } from 'vitest';
import { findPathHit, resolveStrike } from '../src/entities/Hit';

it('a column contact also resolves as a strike at the same position', () => {
  for (let i = 0; i < 10000; i++) {
    const target = { x: 100 + (i % 400) * 0.1, y: 150 + (i % 300) * 0.013, w: 8 + i % 40, h: 7 + i % 23, hittable: true };
    const hit = findPathHit(100, 20, 220, 22, 7, [target]);
    if (!hit) continue;
    expect(resolveStrike(100, hit.y, 22, 7, [target], 1, 0.35), 'sample ' + i).toHaveLength(1);
  }
});

it('the rounding tolerance does not capture a target outside the claw', () => {
  const target = { x: 100, y: 150, w: 18, h: 18, hittable: true };
  const hit = findPathHit(100, 20, 220, 22, 7, [target])!;
  expect(resolveStrike(100, hit.y - 0.001, 22, 7, [target], 1, 0.35)).toHaveLength(0);
});

it('keeps the first obstruction in the column, including a hidden creature behind it', () => {
  const first = { x: 102.8, y: 90.17, w: 21, h: 9, hittable: true };
  const second = { ...first, y: 150 };
  const hidden = { ...first, y: 50, hittable: false };
  const hit = findPathHit(100, 20, 220, 12.9, 4, [second, hidden, first])!;
  expect(hit.target).toBe(first);
  expect(resolveStrike(100, hit.y, 12.9, 4, [second, hidden, first], 1, 0.35)[0].target).toBe(first);
});
