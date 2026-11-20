// The factory's front: a roof terrace over the main entrance and two angular planters on the plaza. The terrace,
// after Giga Texas's: a green roof round a paved terrace with tables under umbrellas and a reflecting pool facing the
// front, and a glass pavilion behind it under a big pale roof plate that comes to a point towards the front. The
// planters have LED strips along their top edges that glow warm at night, and stand clear of every walkway (and the
// walkers' offset), the chatting group and the bench (walkways.ts, streetLife.ts).

import { C } from '../core';
import { onTop, type R } from '../draw';
import { windowsX, windowsY } from '../details';
import { MeshBuilder, drawMesh } from '../mesh';
import type { Palette } from '../palette';
import { BoxItem, FnItem, type Static } from '../statics';

/** the factory's roof (z 13) and the terrace on it, back from the facade (x 26), all as (x, y) */
const ROOF = 13;
const TERRACE = { lawn: [[12, 40.5], [25.6, 40.5], [25.6, 67.5], [12, 67.5]], paving: [[13.5, 45], [19.5, 45], [24.4, 48.5], [24.4, 59.5], [19.5, 63], [13.5, 63]] };
const POOL = [[20.5, 50.5], [23.4, 51.5], [23.4, 56.5], [20.5, 57.5]];
/** the tables' umbrellas, seen from above, out in the open on the paving */
const TABLES = [[23.5, 49.4], [23.5, 58.6], [21.3, 46.4], [21.3, 61.6]];
/** the glass pavilion [x0, y0, x1, y1, height], and its roof plate, coming to a point towards the front */
const PAVILION = [14.5, 48, 19, 60, 2.6];
const PLATE = [[12.8, 46], [19.8, 46], [22.4, 54], [19.8, 62], [12.8, 62]];
const PLATE_Z = [15.6, 15.85];
/** the planters' plans, counter-clockwise (x, y), and their height */
const PLANTERS = [
  [[33.0, 57.0], [35.0, 52.2], [39.5, 53.5], [39.5, 57.0]],
  [[34.0, 63.4], [40.0, 63.4], [40.0, 66.6], [36.5, 67.2]],
];
const PLANTER_H = 0.45;

const bounds = (pts: number[][]) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];

/** A prism over a plan, from z0 to z1: its sides take material slot 0 and its top slot 1. */
function prism(plan: number[][], z0: number, z1: number) {
  const m = new MeshBuilder();
  m.frustum(plan, z0, plan, z1, 0, 1);
  return m.build();
}

/** The terrace's pavilion and its roof plate, and the planters, as static items. */
export function factoryFront(pal: Palette, edge: string) {
  const plate = prism(PLATE, PLATE_Z[0], PLATE_Z[1]);
  const [px0, py0, px1, py1] = bounds(PLATE);
  const [bx0, by0, bx1, by1, bh] = PAVILION;
  // glass all round, lit at night; it stands on the roof, so it casts no shadow on the ground
  const glass = [{ top: 0.15, bot: bh - 0.15, every: 1.5 }];
  const items: Static[] = [
    new BoxItem(bx0, by0, ROOF, bx1, by1, ROOF + bh, pal.factory, { edge }, (r) => {
      windowsX(r, pal, bx1, by0, by1, ROOF + bh, glass);
      windowsY(r, pal, bx0, bx1, by1, ROOF + bh, glass);
    }, false),
    new FnItem(px0, py0, PLATE_Z[0], px1, py1, PLATE_Z[1], (r) => drawMesh(r, plate, 0, 0, 0, 1, 0, [pal.white, pal.white])).still(),
  ];
  for (const plan of PLANTERS) {
    const mesh = prism(plan, 0, PLANTER_H);
    const [x0, y0, x1, y1] = bounds(plan);
    items.push(
      new FnItem(x0, y0, 0, x1, y1, PLANTER_H, (r) => {
        drawMesh(r, mesh, 0, 0, 0, 1, 0, [pal.white, pal.lawn]);
        ledStrip(r, pal, plan, PLANTER_H);
      }).still(),
    );
  }
  return items;
}

/** The LED strip round a planter's top edge: a fine bright line by day, a warm glowing one at night. */
function ledStrip(r: R, pal: Palette, plan: number[][], z: number) {
  const ctx = r.ctx;
  ctx.save();
  ctx.beginPath();
  plan.forEach(([x, y], i) => (i ? ctx.lineTo((x - y) * C, (x + y) * 0.5 - z) : ctx.moveTo((x - y) * C, (x + y) * 0.5 - z)));
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.07;
  if (r.night) {
    ctx.strokeStyle = pal.ledWarm;
    ctx.shadowColor = pal.ledWarm;
    ctx.shadowBlur = r.scale * 0.45;
  } else ctx.strokeStyle = 'rgba(255, 252, 240, 0.9)';
  ctx.stroke();
  ctx.restore();
}

/** The terrace on the factory's roof, over its solar panels: call it from the factory's decoration. */
export function drawRoofTerrace(r: R, pal: Palette) {
  onTop(r, 0, 0, ROOF, (ctx) => {
    const fill = (pts: number[][], color: string) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    fill(TERRACE.lawn, pal.lawn);
    fill(TERRACE.paving, pal.plaza);
    // at night the pavilion's light warms the paving
    if (r.night) fill(TERRACE.paving, 'rgba(255, 186, 104, 0.12)');
    fill(POOL, pal.pool);
    ctx.fillStyle = pal.white.top;
    for (const [x, y] of TABLES) ctx.fillRect(x - 0.45, y - 0.45, 0.9, 0.9);
  });
}
