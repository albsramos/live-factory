// More life in the staff park east of the pavilion (its lawn, path and first benches are in outskirts.ts): a pond
// with a fountain, flower beds, a pergola where staff have lunch, a bench by the water, two people strolling round
// the pond, and more trees. Staff only, sitting, chatting or strolling (docs/simulation.md, the parks). It draws from
// a random stream of its own, so the rest of the town plays out as before.

import type { Activity, Env } from '../activities/activity';
import { Looper } from '../activities/looper';
import { C } from '../core';
import { box, type Ctx, type R } from '../draw';
import { groundPoly } from '../ground';
import { Walker } from '../people/walker';
import type { Sprites } from '../sprites';
import { BoxItem, FnItem, TreeItem } from '../statics';

export interface StaffPark {
  acts: Activity[];
  /** the pond and the flower beds, painted into the cached ground layer */
  ground(ctx: Ctx): void;
}

const POND = { x: 124, y: 4, rx: 5.2, ry: 3.6 };
/** flower beds: x0, y0, x1, y1 */
const BEDS = [[124, 19.4, 130, 20.7], [126, 10.6, 131.5, 11.8], [126, -16, 134, -14.7], [108, -7.6, 115, -6.4]];

/** A closed ring of points round an ellipse on the ground. */
function ellipse(cx: number, cy: number, rx: number, ry: number, n = 28) {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) pts.push(cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry);
  return pts;
}

/** A cheap, steady hash in 0..1 of two numbers, so the flowers sit in the same places every time. */
const hash = (a: number, b: number) => {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

export function buildStaffPark(env: Env, sprites: Sprites, edge: string): StaffPark {
  const { pal, statics: S } = env;
  const person = (x: number, y: number, stance: 'sit' | 'chat', fx: number, fy: number) => {
    const w = new Walker('person', pal, env.rng, x, y);
    w.stance = stance;
    w.face(fx, fy);
    env.crowd.add(w);
  };

  // ------------------------------------------------------------------------------------------- the fountain
  // a stone basin in the middle of the pond; a jet that falls back as droplets, and rings spreading on the water
  const { x: fx, y: fy } = POND;
  const fountain = (r: R) => {
    const ctx = r.ctx;
    // ripples first, on the water round the basin
    ctx.lineWidth = 0.06;
    for (let i = 0; i < 3; i++) {
      const k = (r.t * 0.35 + i / 3) % 1;
      const rad = 1.1 + k * 1.4;
      ctx.strokeStyle = pal.waterHi;
      ctx.globalAlpha = (1 - k) * 0.7;
      ctx.beginPath();
      groundPoly(ctx, ellipse(fx, fy, rad, rad, 24));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    box(r, fx - 0.8, fy - 0.8, 0, fx + 0.8, fy + 0.8, 0.35, pal.white, { edge });
    // the jet: a column, and droplets arcing out and down
    const X = (fx - fy) * C, Y = (fx + fy) * 0.5;
    ctx.strokeStyle = pal.waterHi;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 0.13;
    ctx.beginPath();
    ctx.moveTo(X, Y - 0.35);
    ctx.lineTo(X + Math.sin(r.t * 3) * 0.03, Y - 2.6);
    ctx.stroke();
    ctx.fillStyle = pal.waterHi;
    for (let i = 0; i < 28; i++) {
      const k = (r.t * 0.8 + i / 28) % 1;
      const a = i * 2.39996;
      const x = fx + Math.cos(a) * k * 1.3, y = fy + Math.sin(a) * k * 1.3;
      const z = 0.35 + 2.2 * (1 - (2 * k - 0.15) * (2 * k - 0.15));
      if (z < 0.35) continue;
      ctx.globalAlpha = 0.85 - k * 0.5;
      ctx.beginPath();
      ctx.arc((x - y) * C, (x + y) * 0.5 - z, 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  S.push(new FnItem(fx - 2.6, fy - 2.6, 0, fx + 2.6, fy + 2.6, 2.8, fountain));

  // ------------------------------------------------------------------------------------------- the pergola
  // posts end where the beams begin and the slats sit on the beams, so no two boxes overlap in all three axes
  const px0 = 108, px1 = 115, py0 = -14, py1 = -9;
  for (const [x, y] of [[px0, py0], [px1 - 0.25, py0], [px0, py1 - 0.25], [px1 - 0.25, py1 - 0.25]]) {
    S.push(new BoxItem(x, y, 0, x + 0.25, y + 0.25, 2.4, pal.white, { edge }));
  }
  S.push(new BoxItem(px0, py0, 2.4, px1, py0 + 0.25, 2.6, pal.white, { edge }), new BoxItem(px0, py1 - 0.25, 2.4, px1, py1, 2.6, pal.white, { edge }));
  for (let x = px0 + 0.4; x < px1 - 0.2; x += 0.9) S.push(new BoxItem(x, py0, 2.6, x + 0.18, py1, 2.74, pal.white, { edge }));
  // a table under it with a bench either side, and staff at lunch
  S.push(
    new BoxItem(109.6, -11.9, 0, 113.4, -11.1, 0.74, pal.white, { edge }),
    new BoxItem(109.6, -13.4, 0, 113.4, -12.9, 0.45, pal.white, { edge }),
    new BoxItem(109.6, -10.1, 0, 113.4, -9.6, 0.45, pal.white, { edge }),
  );
  person(110.2, -12.55, 'sit', 0, 1);
  person(111.4, -12.55, 'sit', 0, 1);
  person(112.6, -10.45, 'sit', 0, -1);
  person(110.6, -10.45, 'sit', 0, -1);

  // ------------------------------------------------------------------------------------------- by the water
  // a bench facing the pond, and two people strolling round it
  S.push(new BoxItem(122.1, -3.4, 0, 123.9, -2.9, 0.45, pal.white, { edge }));
  person(122.6, -2.55, 'sit', 0, 1);
  person(123.4, -2.55, 'sit', 0, 1);
  const ring = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return { x: fx + Math.cos(a) * 6.6, y: fy + Math.sin(a) * 5.0 };
  });
  const stroll = (from: number) => () => Array.from({ length: 10 }, (_, i) => ({ ...ring[(from + i + 1) % 10], speed: 0.7 }));
  const acts: Activity[] = [new Looper(env, 'person', stroll(0), ring[0].x, ring[0].y), new Looper(env, 'person', stroll(1), ring[1].x + 0.6, ring[1].y)];

  // a few more staff chatting on the grass
  for (const group of [[[127.4, -4.6], [128.6, -4.0], [127.8, -3.2]], [[134.2, 25.4], [135.3, 26.0]], [[117.8, -7.6], [118.9, -8.2]]]) {
    const cx = group.reduce((a, p) => a + p[0], 0) / group.length, cy = group.reduce((a, p) => a + p[1], 0) / group.length;
    for (const [x, y] of group) person(x, y, 'chat', cx - x, cy - y);
  }

  // ------------------------------------------------------------------------------------------- trees
  const trees: [number, number, 'tree' | 'tree2' | 'poplar' | 'small', number][] = [
    [104, -16, 'tree', 1], [117, -18.5, 'tree2', 1], [121.5, -14, 'small', 0.9], [136.5, -17, 'tree', 1],
    [137.6, -8, 'poplar', 0.95], [137.8, 2, 'tree2', 0.9], [133, 14, 'tree', 1], [138, 11, 'small', 0.85],
    [124, 32.6, 'tree2', 0.9], [138, 32.5, 'poplar', 0.9], [131.5, -2.5, 'small', 0.85], [116.5, 7.5, 'small', 0.8],
  ];
  trees.forEach(([x, y, k, s], i) => S.push(new TreeItem(sprites, x, y, k, s, 80 + i * 1.3)));

  const ground = (ctx: Ctx) => {
    // the pond with a paved rim
    ctx.fillStyle = pal.water;
    ctx.strokeStyle = pal.plaza;
    ctx.lineWidth = 0.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    groundPoly(ctx, ellipse(POND.x, POND.y, POND.rx, POND.ry));
    ctx.fill();
    ctx.stroke();
    // flower beds: earth, then flowers in the palette's colours, the same pattern every time
    ctx.fillStyle = pal.soil;
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of BEDS) groundPoly(ctx, [x0, y0, x1, y0, x1, y1, x0, y1]);
    ctx.fill();
    for (const [x0, y0, x1, y1] of BEDS) {
      for (let x = x0 + 0.25; x < x1 - 0.1; x += 0.38) {
        for (let y = y0 + 0.2; y < y1 - 0.1; y += 0.36) {
          const h = hash(x, y);
          const jx = x + (hash(y, x) - 0.5) * 0.2, jy = y + (h - 0.5) * 0.2;
          ctx.fillStyle = pal.flowers[Math.floor(h * pal.flowers.length)];
          ctx.beginPath();
          ctx.arc((jx - jy) * C, (jx + jy) * 0.5, 0.15, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  return { acts, ground };
}
