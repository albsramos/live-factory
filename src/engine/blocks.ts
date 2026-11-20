// Repeated building blocks: an open-air compute platform (rows of server racks on a concrete pad with a pulsing
// glow along its front edges) and rows of Megapack grid batteries. The campus core and the outskirts both use them.

import { batteryFront, batteryLed, rackFront, rackLeds } from './details';
import { box } from './draw';
import { lineW } from './ground';
import type { Palette } from './palette';
import { BoxItem, FnItem, type Static } from './statics';

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * A compute platform: `rows` rows of `cols` racks, fronts facing +y, starting just inside `pad`. Returns the next
 * seed so blinking patterns stay different across platforms.
 */
export function rackPlatform(S: Static[], pal: Palette, edge: string, pad: Rect, rows: number, cols: number, seed = 0) {
  const { x0, y0, x1, y1 } = pad;
  S.push(
    new FnItem(x0, y0, 0, x1, y1, 0.35, (r) => {
      box(r, x0, y0, 0, x1, y1, 0.35, pal.concrete, { edge });
      const ctx = r.ctx;
      const pulse = 0.5 + 0.5 * Math.sin(r.t * 1.2 + x0 * 0.1);
      ctx.save();
      if (r.night) ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = pal.glow;
      ctx.shadowColor = pal.glow;
      // the light runs along the pad's top edge, inside the glass hall over it (its walls glow blue at their foot)
      ctx.lineJoin = 'round';
      ctx.shadowBlur = (0.6 + pulse * 0.4) * r.scale;
      ctx.globalAlpha = 0.35 + 0.3 * pulse;
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      lineW(ctx, x0 + 0.2, y1 - 0.2, 0.36, x1 - 0.2, y1 - 0.2, 0.36);
      lineW(ctx, x1 - 0.2, y1 - 0.2, 0.36, x1 - 0.2, y0 + 0.2, 0.36);
      ctx.stroke();
      ctx.restore();
    }),
  );
  let s = seed;
  for (let row = 0; row < rows; row++) {
    const ry = y0 + 0.8 + row * 2.45;
    for (let col = 0; col < cols; col++) {
      const rx0 = x0 + 0.8 + col * 3.73, rx1 = rx0 + 3.33;
      const k = s++;
      S.push(new BoxItem(rx0, ry, 0.35, rx1, ry + 1.1, 2.65, pal.rack, { edge }, (r) => rackFront(r, pal, rx0, rx1, ry + 1.1, 0.35, 2.65)).live((r) => rackLeds(r, pal, rx0, rx1, ry + 1.1, 2.65, k)));
    }
  }
  return s;
}

/** Megapacks: one unit per column span at each row's y, doors facing +y with breathing status lights. */
export function megapacks(S: Static[], pal: Palette, edge: string, cols: readonly (readonly [number, number])[], rowYs: readonly number[], seed = 0) {
  let s = seed;
  for (const y0 of rowYs) {
    for (const [x0, x1] of cols) {
      const k = s++;
      S.push(new BoxItem(x0, y0, 0, x1, y0 + 1.7, 2.7, pal.bright, { edge }, (r) => batteryFront(r, pal, x0, x1, y0 + 1.7, 2.7)).live((r) => batteryLed(r, pal, x0, x1, y0 + 1.7, 2.7, k)));
    }
  }
  return s;
}
