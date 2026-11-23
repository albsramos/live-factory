// The lake at the north end of the staff park, between the pergola and the east road, just south of the north
// belt's trees: an irregular shoreline with a thin pale edge, and rocks along the shore and a few out in the water.
// The path round it (staffPark.ts) comes up to its south shore and goes round its east side to the belt's path.

import type { Env } from '../activities/activity';
import { C, rr } from '../core';
import type { Ctx, R } from '../draw';
import { groundPoly } from '../ground';
import { FnItem } from '../statics';

/** the shoreline, counter-clockwise on screen */
export const LAKE = [
  104.5, -30, 106, -35.5, 110, -38.5, 116, -38.8, 121, -37.8, 126, -37.6, 131, -35, 134.8, -30, 135.5, -25.5,
  131.5, -23.3, 126, -22.8, 121.5, -23.4, 116.5, -25.5, 110, -26.2, 106, -27.5,
];

/** rocks: x, y, size (radius, m) */
const ROCKS = [
  // a cluster on the west shore
  [105.4, -27.6, 1.1], [104.0, -29.6, 0.7], [107.3, -26.3, 0.55], [106.2, -25.6, 0.4],
  // the east shore, by the path
  [133.6, -25.6, 1.2], [135.2, -27.4, 0.75], [131.8, -23.6, 0.55], [133.6, -26.9, 0.45],
  // the south shore, where the path comes up
  [118.4, -24.2, 0.85], [119.8, -23.7, 0.5], [116.9, -25.0, 0.4],
  // out in the water
  [127.4, -31.4, 0.95], [128.6, -30.4, 0.55], [113.0, -33.0, 0.7], [113.9, -34.0, 0.4],
  // the north shore
  [122.2, -38.4, 0.75], [110.8, -38.6, 0.6], [124.0, -37.9, 0.4],
];

/** A rock: a lumpy footprint on the ground rising to a smaller, flatter top, shaded by which way each side faces. */
function rock(r: R, x: number, y: number, size: number, shape: number[], m: { top: string; left: string; right: string }) {
  const ctx = r.ctx, n = shape.length, h = size * 0.75;
  const P = (i: number, k: number, z: number) => {
    const a = (i / n) * Math.PI * 2, rad = size * shape[i] * k;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    return [(px - py) * C, (px + py) * 0.5 - z];
  };
  // the sides that face the camera (+x and +y), back to front
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2, nx = Math.cos(a), ny = Math.sin(a);
    if (nx + ny < -0.2) continue;
    const b0 = P(i, 1, 0), b1 = P((i + 1) % n, 1, 0), t1 = P((i + 1) % n, 0.62, h), t0 = P(i, 0.62, h);
    ctx.fillStyle = nx > ny ? m.right : m.left;
    ctx.beginPath();
    ctx.moveTo(b0[0], b0[1]);
    ctx.lineTo(b1[0], b1[1]);
    ctx.lineTo(t1[0], t1[1]);
    ctx.lineTo(t0[0], t0[1]);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = m.top;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p = P(i, 0.62, h);
    if (i === 0) ctx.moveTo(p[0], p[1]);
    else ctx.lineTo(p[0], p[1]);
  }
  ctx.closePath();
  ctx.fill();
}

export function buildLake(env: Env) {
  const { pal, statics: S, rng } = env;
  for (const [x, y, size] of ROCKS) {
    const shape = Array.from({ length: 7 }, () => rr(rng, 0.75, 1.15));
    S.push(new FnItem(x - size, y - size, 0, x + size, y + size, size * 0.75, (r) => rock(r, x, y, size, shape, pal.rock)).still());
  }
  const ground = (ctx: Ctx) => {
    ctx.fillStyle = pal.water;
    ctx.strokeStyle = pal.plaza;
    ctx.lineWidth = 0.35;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    groundPoly(ctx, LAKE);
    ctx.fill();
    ctx.stroke();
  };
  return { ground };
}
