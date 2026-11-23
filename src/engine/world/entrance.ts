// The factory's main entrance on the plaza: the ground floor steps back in a V under the flush facade above, its
// glass walls angling in like an arrowhead to a dark door at the tip, and two pillars stand in its mouth, in line with
// the door's jambs.
//
// The recess is drawn as part of the factory's +x face, clipped to the opening, so it needs no sort item of its own.
// People come and go at the walkway's door node just in front of the door, which is inside the factory's box: the
// sort's fallback always draws a figure there after the factory (docs/simulation.md). The pillars are items, so they
// hide whoever walks behind them, and clip to the same opening so the floor above covers their tops.

import { sx, sy } from '../core';
import { box, edgeColor, onFaceX, onWall, type Ctx, type R } from '../draw';
import { ribbons, windowGlow, type Band } from '../details';
import type { Palette } from '../palette';
import { FnItem } from '../statics';

/**
 * The opening in the factory's face at x, from y0 to y1 (lined up with the mullions of the floors above), its height
 * (the underside of the floor above), how far back the door stands and the door's width, centred.
 */
export const ENTRANCE = { x: 26, y0: 48, y1: 60, h: 3.8, depth: 2.4, door: 3.6 };
const MID = (ENTRANCE.y0 + ENTRANCE.y1) / 2;

/** where people go in and out: just in front of the door, shallow enough that a figure stays below the floor above */
export const ENTRANCE_DOOR = { x: 24.9, y: MID };

/** Clip to the opening: whatever stands in the recess shows only through it. */
function clipToOpening(ctx: Ctx) {
  const { x, y0, y1, h } = ENTRANCE;
  ctx.beginPath();
  ctx.moveTo(sx(x, y1), sy(x, y1, h));
  ctx.lineTo(sx(x, y0), sy(x, y0, h));
  ctx.lineTo(sx(x, y0), sy(x, y0, 0));
  ctx.lineTo(sx(x, y1), sy(x, y1, 0));
  ctx.closePath();
  ctx.clip();
}

/** The entrance, drawn over the factory's +x face: call it from the factory's decoration. */
export function drawEntrance(r: R, pal: Palette, edge: string) {
  const ctx = r.ctx;
  const { x, y0, y1, h } = ENTRANCE;
  const bx = x - ENTRANCE.depth, d0 = MID - ENTRANCE.door / 2, d1 = MID + ENTRANCE.door / 2;
  ctx.save();
  clipToOpening(ctx);
  // the floor fills the opening, in the shade of the storeys above and darker towards the door; the walls and the
  // door stand on it
  ctx.fillStyle = pal.plaza;
  ctx.fill();
  ctx.fillStyle = pal.shadow;
  ctx.fill();
  ctx.fill();
  const g = ctx.createLinearGradient(sx(x, MID), sy(x, MID, 0), sx(bx, MID), sy(bx, MID, 0));
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
  ctx.strokeStyle = edgeColor(r, edge) ?? '';
  ctx.lineWidth = 0.09;
  ctx.stroke();
}

/** The two square pillars in the entrance's mouth, carrying the floor above, in line with the door's jambs. */
export function entrancePillars(pal: Palette, edge: string) {
  const { x, h, door } = ENTRANCE;
  const s = 0.15;
  return [MID - door / 2, MID + door / 2].map((y) =>
    new FnItem(x - 2 * s, y - s, 0, x, y + s, h, (r) => {
      r.ctx.save();
      clipToOpening(r.ctx);
      box(r, x - 2 * s, y - s, 0, x, y + s, h, pal.white, { edge });
      r.ctx.restore();
    }).still(),
  );
}
