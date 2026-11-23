// The factory's front: a roof terrace over the main entrance and two angular planters on the plaza. The terrace,
// after Giga Texas's: a green roof round a paved terrace with tables and benches where two Optimus robots walk about,
// and a glass pavilion under a big pale roof plate that comes to a point towards the front. The
// planters have LED strips along their top edges that glow warm at night, and stand clear of every walkway (and the
// walkers' offset), the chatting group and the bench (walkways.ts, streetLife.ts).

import { C } from '../core';
import { onTop, type R } from '../draw';
import { windowsX, windowsY } from '../details';
import { MeshBuilder, drawMesh } from '../mesh';
import type { Palette } from '../palette';
import { BoxItem, FnItem, type Static } from '../statics';
import { Looper } from '../activities/looper';
import type { Activity, Env } from '../activities/activity';

/** the factory's roof (z 13) and the terrace on it, back from the facade (x 26), all as (x, y) */
const ROOF = 13;
/** the terrace's area on the roof, x0, y0, x1, y1: 80% of the factory's front (36 m), the solar rows stop short of it */
export const TERRACE_AREA = [12, 39.6, 26, 68.4];
const TERRACE = { lawn: [[12, 39.6], [25.6, 39.6], [25.6, 68.4], [12, 68.4]], paving: [[13.5, 45], [24.4, 45], [24.4, 63], [13.5, 63]] };
/**
 * The furniture out in the open in front of the pavilion's roof plate, as boxes [x0, y0, x1, y1, height]: at each
 * front corner a table with a bench either side, and two benches along the front edge. The robots walk clear of it.
 */
const FURNITURE = [
  ...[46.6, 61.4].flatMap((y) => [[22.2, y - 0.7, 23.0, y + 0.7, 0.75], [21.5, y - 0.7, 21.85, y + 0.7, 0.45], [23.35, y - 0.7, 23.7, y + 0.7, 0.45]]),
  [23.85, 51.8, 24.25, 53.6, 0.45],
  [23.85, 54.4, 24.25, 56.2, 0.45],
];
/** the glass pavilion [x0, y0, x1, y1, height], and its roof plate, coming to a shallow point towards the front */
const PAVILION = [14.5, 48, 19, 60, 3.0];
const PLATE = [[12.8, 46], [19.6, 46], [20.6, 54], [19.6, 62], [12.8, 62]];
const PLATE_Z = [16.0, 16.25];
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
    ...FURNITURE.map(([x0, y0, x1, y1, h]) => new BoxItem(x0, y0, ROOF, x1, y1, ROOF + h, pal.white, { edge }, undefined, false)),
  ];
  items.push(...ledPlanters(pal, PLANTERS));
  return items;
}

/** Low angular planters over the plans given, grass on top and an LED strip round the top edge. */
function ledPlanters(pal: Palette, plans: number[][][]): Static[] {
  return plans.map((given) => {
    // the mesh wants its plan counter-clockwise; take either way round
    let area = 0;
    given.forEach(([x, y], i) => {
      const [nx, ny] = given[(i + 1) % given.length];
      area += x * ny - nx * y;
    });
    const plan = area < 0 ? [...given].reverse() : given;
    const mesh = prism(plan, 0, PLANTER_H);
    const [x0, y0, x1, y1] = bounds(plan);
    return new FnItem(x0, y0, 0, x1, y1, PLANTER_H, (r) => {
      drawMesh(r, mesh, 0, 0, 0, 1, 0, [pal.white, pal.lawn]);
      ledStrip(r, pal, plan, PLANTER_H);
    }).still();
  });
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
  });
}

/**
 * Two Optimus robots on the terrace: one makes the round of the open paving in front of the pavilion, pausing at its
 * corners, the other paces the green roof beside it. Give them a random stream of their own, so the rest of the
 * seeded scene stays as it was.
 */
export function roofWalks(env: Env): Activity[] {
  const z = ROOF;
  return [
    new Looper(env, 'robot', () => [{ x: 21.4, y: 48.6, z, wait: 2 }, { x: 23.2, y: 49.0, z }, { x: 23.2, y: 59.0, z, wait: 3 }, { x: 21.4, y: 59.4, z }], 21.4, 48.6, z),
    new Looper(env, 'robot', () => [{ x: 14, y: 42.6, z, wait: 2.5 }, { x: 24, y: 42.6, z, wait: 2 }], 14, 42.6, z),
  ];
}
