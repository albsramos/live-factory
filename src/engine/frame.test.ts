import { describe, expect, it } from 'vitest';
import { DEFAULTS, fitView, WORLD } from './frame';

const view = (W: number, H: number, o: Partial<typeof DEFAULTS> = {}) => fitView(W, H, { ...DEFAULTS, ...o });
const inside = (v: ReturnType<typeof fitView>) =>
  v.cx - v.hw >= WORLD.x0 - 1e-6 && v.cx + v.hw <= WORLD.x1 + 1e-6 && v.cy - v.hh >= WORLD.y0 - 1e-6 && v.cy + v.hh <= WORLD.y1 + 1e-6;

describe('fitView', () => {
  it('never zooms out past the built world', () => {
    for (const [W, H] of [[1440, 724], [2560, 724], [5120, 1100], [7680, 400], [1630, 520], [390, 844]]) {
      for (const fit of ['cover', 'contain'] as const) {
        const fitted = view(W, H, { fit });
        for (const zoom of [0.9, 0.67, 0.3]) {
          const v = view(W, H, { fit, zoom });
          // inside the world, or, where even the fit shows past it (contain on a very wide box), no further out
          expect(inside(v) || v.zoom === fitted.zoom).toBe(true);
          expect(v.zoom).toBeLessThanOrEqual(fitted.zoom);
        }
      }
    }
  });

  it('leaves the usual framings alone', () => {
    // the classic shape, a banner in both fits, and a tall box: what they showed before the world box existed
    expect(view(1212, 650)).toMatchObject({ zoom: 10, cx: 0, cy: 47.5 });
    expect(view(1630, 520, { fit: 'contain' }).zoom).toBeCloseTo(8, 6);
    expect(view(390, 844, { fit: 'contain' }).zoom).toBeCloseTo(390 / 121.2, 6);
    expect(view(1630, 520).zoom).toBeCloseTo(520 / (65 * 0.7), 6);
  });

  it('still zooms out where the world has room', () => {
    // 1440 x 724 at two thirds: the whole height of the world view, wider than the frame
    const v = view(1440, 724, { fit: 'contain', zoom: 0.67 });
    expect(v.zoom).toBeCloseTo((724 / 65) * 0.67, 6);
    expect(v.hw * 2).toBeGreaterThan(121.2 * 1.4);
  });
});
