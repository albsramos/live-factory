// A recessed entrance: the ground floor of a +x face steps back in a V, glass walls angling in to a dark door at its
// tip, under the storeys above. It is drawn as part of the face it is cut into, clipped to the opening, so it needs
// no sort item of its own; the pillars in its mouth clip to the same opening.

import { sx, sy } from './core';
import { box, onFaceX, onWall, type Ctx, type R } from './draw';
import { ribbons, windowGlow, type Band } from './details';
import type { Palette } from './palette';
import { FnItem } from './statics';

export interface Recess {
  /** the face it is cut into */
  x: number;
  /** the opening along the face */
  y0: number;
  y1: number;
  /** the opening's height: the underside of the floor above */
  h: number;
  /** how far the door stands back from the face */
  depth: number;
  /** the door's width, centred in the opening */
  door: number;
}

/** Clip to the opening: whatever stands in the recess shows only through it, under the floor above. */
function clipToOpening(ctx: Ctx, e: Recess) {
  ctx.beginPath();
  ctx.moveTo(sx(e.x, e.y1), sy(e.x, e.y1, e.h));
  ctx.lineTo(sx(e.x, e.y0), sy(e.x, e.y0, e.h));
  ctx.lineTo(sx(e.x, e.y0), sy(e.x, e.y0, 0));
  ctx.lineTo(sx(e.x, e.y1), sy(e.x, e.y1, 0));
  ctx.closePath();
  ctx.clip();
}

/** The recess, drawn over the face it is cut into: call it from that building's decoration. */
export function recessX(r: R, pal: Palette, e: Recess, edge: string) {
  const ctx = r.ctx;
  const { x, y0, y1, h } = e;
  const bx = x - e.depth, ym = (y0 + y1) / 2, d0 = ym - e.door / 2, d1 = ym + e.door / 2;
  ctx.save();
  clipToOpening(ctx, e);
  // the floor fills the opening, in the shade of the storeys above and darker towards the door; the walls and the
  // door stand on it
  ctx.fillStyle = pal.plaza;
  ctx.fill();
  ctx.fillStyle = pal.shadow;
  ctx.fill();
  ctx.fill();
  const g = ctx.createLinearGradient(sx(x, ym), sy(x, ym, 0), sx(bx, ym), sy(bx, ym, 0));
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, pal.ao);
  ctx.fillStyle = g;
  ctx.fill();
  if (r.night) {
    // the lit glass warms the floor between the walls
    ctx.fillStyle = 'rgba(255, 186, 104, 0.14)';
    ctx.fill();
  }
  // the two glass walls: the one on the right faces the camera, the left one is seen edge-on and a shade darker
  const bands: Band[] = [{ top: 0.12, bot: h - 0.12, every: 1.1 }];
  const pane = (c: Ctx, w: number, dim: number) => {
    c.fillStyle = pal.white.right;
    c.fillRect(0, 0, w, h);
    bands[0].spans = [[0.1, w - 0.1]];
    ribbons(r, pal, c, w, bands);
    windowGlow(r, c, w, bands);
    if (!r.night) {
      c.fillStyle = pal.faceShadow;
      for (let i = 0; i < dim; i++) c.fillRect(0, 0, w, h);
    }
  };
  onWall(r, bx, d0, x, y0, h, (c, w) => pane(c, w, 2));
  onWall(r, x, y1, bx, d1, h, (c, w) => pane(c, w, 3));
  // the door at the tip: dark glass in two pairs of leaves with pull handles, under a transom
  onFaceX(r, bx, d0, d1, h, (c, w) => {
    c.fillStyle = pal.white.right;
    c.fillRect(0, 0, w, h);
    c.fillStyle = pal.glassDark;
    c.fillRect(0.12, 0.12, w - 0.24, h - 0.12);
    c.strokeStyle = r.night ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.16)';
    c.lineWidth = 0.07;
    c.beginPath();
    for (let i = 1; i < 4; i++) {
      c.moveTo((w * i) / 4, h - 2.6);
      c.lineTo((w * i) / 4, h);
    }
    c.moveTo(0.12, h - 2.6);
    c.lineTo(w - 0.12, h - 2.6);
    c.stroke();
    c.strokeStyle = r.night ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.5)';
    c.lineWidth = 0.06;
    c.beginPath();
    for (const u of [w / 4 - 0.14, w / 4 + 0.14, (3 * w) / 4 - 0.14, (3 * w) / 4 + 0.14]) {
      c.moveTo(u, h - 1.3);
      c.lineTo(u, h - 0.8);
    }
    c.stroke();
  });
  // by day the storeys above darken the top of the opening (at night the glass is lit from inside)
  if (!r.night) onFaceX(r, x, y0, y1, h, (c, w) => {
    const s = c.createLinearGradient(0, 0, 0, 1.6);
    s.addColorStop(0, pal.ao);
    s.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.fillStyle = s;
    c.fillRect(0, 0, w, 1.6);
  });
  ctx.restore();
  // the edge of the slab over the opening
  ctx.beginPath();
  ctx.moveTo(sx(x, y1), sy(x, y1, h));
  ctx.lineTo(sx(x, y0), sy(x, y0, h));
  ctx.strokeStyle = edge;
  ctx.lineWidth = 0.09;
  ctx.stroke();
}

/** Square pillars in the mouth of the recess, carrying the floor above, one at each `ys` along the face. */
export function recessPillars(pal: Palette, e: Recess, edge: string, ys: readonly number[]) {
  const s = 0.15;
  return ys.map((y) =>
    new FnItem(e.x - 2 * s, y - s, 0, e.x, y + s, e.h, (r) => {
      r.ctx.save();
      clipToOpening(r.ctx, e);
      box(r, e.x - 2 * s, y - s, 0, e.x, y + s, e.h, pal.white, { edge });
      r.ctx.restore();
    }).still(),
  );
}
