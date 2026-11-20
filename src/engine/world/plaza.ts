// The factory's front, after Giga Berlin's: a thin bronze roof canopy along the top of the facade,
// flaring out to a sharp point at the plaza's corner, and two angular planters on the plaza with LED strips along
// their top edges that glow warm at night. The planters stand clear of every walkway (and the walkers' offset), the
// chatting group and the bench (walkways.ts, streetLife.ts).

import { C } from '../core';
import type { R } from '../draw';
import { MeshBuilder, drawMesh } from '../mesh';
import type { Palette } from '../palette';
import { FnItem } from '../statics';

/** the canopy's plan, counter-clockwise (x, y): over the roof's edge, out past the facade (x 26), widening to a point */
const CANOPY = [[25.2, 37], [27.6, 37], [28.8, 74.4], [25.2, 72.6]];
const CANOPY_Z = [13.0, 13.25];
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

/** The canopy and the planters, as static items. */
export function factoryFront(pal: Palette) {
  const canopy = prism(CANOPY, CANOPY_Z[0], CANOPY_Z[1]);
  const [cx0, cy0, cx1, cy1] = bounds(CANOPY);
  const items = [
    // bronze all over, as at Giga Berlin
    new FnItem(cx0, cy0, CANOPY_Z[0], cx1, cy1, CANOPY_Z[1], (r) => drawMesh(r, canopy, 0, 0, 0, 1, 0, [pal.gold, pal.gold])).still(),
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
