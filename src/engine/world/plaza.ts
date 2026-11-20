// The factory's front, after Giga Berlin's: a glass rooftop bar along the front edge of the roof, under a thin bronze
// roof that overhangs the facade and flares out to a sharp point at the plaza's corner, and two angular planters on
// the plaza with LED strips along their top edges that glow warm at night. The planters stand clear of every walkway (and the walkers' offset), the
// chatting group and the bench (walkways.ts, streetLife.ts).

import { C } from '../core';
import type { R } from '../draw';
import { windowsX, windowsY } from '../details';
import { MeshBuilder, drawMesh } from '../mesh';
import type { Palette } from '../palette';
import { BoxItem, FnItem, type Static } from '../statics';

/** the rooftop bar on the factory's roof (z 13), set back a little from its facade (x 26): [x0, y0, x1, y1, height] */
const BAR = [21.5, 40, 25.8, 70, 3.4];
/** the bar's roof, counter-clockwise (x, y): over the whole bar, out past the facade, widening to a point at the corner */
const CANOPY = [[21.2, 39.2], [26.6, 39.2], [28.2, 74], [21.2, 71.2]];
const CANOPY_Z = [16.4, 16.65];
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

/** The rooftop bar and its roof, and the planters, as static items. */
export function factoryFront(pal: Palette, edge: string) {
  const canopy = prism(CANOPY, CANOPY_Z[0], CANOPY_Z[1]);
  const [cx0, cy0, cx1, cy1] = bounds(CANOPY);
  const [bx0, by0, bx1, by1, bh] = BAR;
  // glass all round, lit at night; it stands on the roof, so it casts no shadow on the ground
  const glass = [{ top: 0.15, bot: bh - 0.15, every: 1.5 }];
  const items: Static[] = [
    new BoxItem(bx0, by0, 13, bx1, by1, 13 + bh, pal.factory, { edge }, (r) => {
      windowsX(r, pal, bx1, by0, by1, 13 + bh, glass);
      windowsY(r, pal, bx0, bx1, by1, 13 + bh, glass);
    }, false),
    // the roof: bronze all over, as at Giga Berlin
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
