// The factory's roof of solar panels in rows tilted at 45°, each row a long sloped panel rising from its low front
// edge (towards +y, facing the camera) to its high back edge, on a light frame. They rise above the roof, so each
// row (or each stretch of one beside the roof terrace) is an item of its own rather than a picture on the roof.

import { sx, sy } from '../core';
import type { R } from '../draw';
import type { Palette } from '../palette';
import { FnItem } from '../statics';

/** a row's depth on plan and its rise (45°: the same), the gap between rows, and the panels' cell width */
const DEPTH = 1.84, RISE = 1.84, PITCH = 3.35, CELL = 1.05;

export interface SolarRoof {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** the roof's height */
  z: number;
  /** margin left clear round the roof's edge */
  inset: number;
  /** a stretch of the roof the rows stop short of (the terrace): x0, y0, x1, y1 */
  skip?: number[];
}

/** The rows as static items. */
export function solarRows(pal: Palette, roof: SolarRoof) {
  const { x0, y0, x1, y1, z, inset, skip } = roof;
  const items: FnItem[] = [];
  for (let q = y0 + inset; q + DEPTH <= y1 - inset; q += PITCH) {
    const yb = q, yf = q + DEPTH;
    // beside the terrace, a row runs only up to it
    const isBeside = skip && yf > skip[1] && yb < skip[3];
    const xa = x0 + inset, xb = isBeside ? skip[0] - 0.5 : x1 - inset;
    if (xb - xa < 2) continue;
    items.push(new FnItem(xa, yb, z, xb, yf, z + RISE, (r) => drawRow(r, pal, xa, xb, yb, yf, z)).still());
  }
  return items;
}

function drawRow(r: R, pal: Palette, xa: number, xb: number, yb: number, yf: number, z: number) {
  const ctx = r.ctx;
  const P = (x: number, y: number, h: number) => [sx(x, y), sy(x, y, h)];
  const poly = (pts: number[][], color: string) => {
    ctx.beginPath();
    pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  // the frame's end at +x (the side the camera sees), then the sloped panel from the low front to the high back
  poly([P(xb, yf, z), P(xb, yb, z), P(xb, yb, z + RISE)], pal.solarFrame);
  poly([P(xa, yf, z), P(xb, yf, z), P(xb, yb, z + RISE), P(xa, yb, z + RISE)], pal.solar);
  // the cells: lines up the slope, and one along it halfway up
  ctx.beginPath();
  for (let x = xa + CELL; x < xb - 0.1; x += CELL) {
    const [ax, ay] = P(x, yf, z), [bx, by] = P(x, yb, z + RISE);
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  const ym = (yb + yf) / 2, zm = z + RISE / 2;
  const [mx0, my0] = P(xa, ym, zm), [mx1, my1] = P(xb, ym, zm);
  ctx.moveTo(mx0, my0);
  ctx.lineTo(mx1, my1);
  ctx.strokeStyle = pal.solarLine;
  ctx.lineWidth = 0.06;
  ctx.stroke();
  // a light frame along the top edge
  const [tx0, ty0] = P(xa, yb, z + RISE), [tx1, ty1] = P(xb, yb, z + RISE);
  ctx.beginPath();
  ctx.moveTo(tx0, ty0);
  ctx.lineTo(tx1, ty1);
  ctx.strokeStyle = pal.solarFrame;
  ctx.lineWidth = 0.08;
  ctx.stroke();
}
