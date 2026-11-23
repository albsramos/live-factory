// More life in the staff park east of the pavilion (its lawn, path and first benches are in outskirts.ts): a pond
// with a fountain, a pergola where staff have lunch, a bench by the water, two people strolling round
// the pond, and more trees. Staff only, sitting, chatting or strolling (docs/simulation.md, the parks). It draws from
// a random stream of its own, so the rest of the town plays out as before.

import type { Activity, Env } from '../activities/activity';
import { Looper } from '../activities/looper';
import { C } from '../core';
import { box, type Ctx, type R } from '../draw';
import { groundPoly, lineW } from '../ground';
import type { WalkGraph } from '../people/crowd';
import { Walker } from '../people/walker';
import type { Sprites } from '../sprites';
import { BoxItem, FnItem, TreeItem } from '../statics';

export interface StaffPark {
  acts: Activity[];
  /** the path round the pond, past the lake and across the park: from the main path at (119, 27.5) to the north belt's at y −47 */
  walks(g: WalkGraph, from: number, to: number): void;
  /** the pond and its paths, painted into the cached ground layer */
  ground(ctx: Ctx): void;
}

const POND = { x: 124, y: 4, rx: 5.2, ry: 3.6 };

/** A closed ring of points round an ellipse on the ground. */
function ellipse(cx: number, cy: number, rx: number, ry: number, n = 28) {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) pts.push(cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry);
  return pts;
}

/** A smooth curve through the points (Catmull–Rom, a few points per stretch), for paths that wind. */
function curve(pts: number[][], steps = 6) {
  const out: number[][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

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
  for (const group of [[[124.4, -4.6], [125.6, -4.0], [124.8, -3.2]], [[134.2, 25.4], [135.3, 26.0]], [[117.8, -7.6], [118.9, -8.2]]]) {
    const cx = group.reduce((a, p) => a + p[0], 0) / group.length, cy = group.reduce((a, p) => a + p[1], 0) / group.length;
    for (const [x, y] of group) person(x, y, 'chat', cx - x, cy - y);
  }

  // ------------------------------------------------------------------------------------------- trees
  const trees: [number, number, 'tree' | 'tree2' | 'poplar' | 'small', number][] = [
    [104, -16, 'tree', 1], [117, -18.5, 'tree2', 1], [121.5, -14, 'small', 0.9], [136.5, -17, 'tree', 1],
    [137.6, -8, 'poplar', 0.95], [137.8, 2, 'tree2', 0.9], [133, 14, 'tree', 1], [138, 11, 'small', 0.85],
    [124, 32.6, 'tree2', 0.9], [138, 32.5, 'poplar', 0.9], [134, -1, 'small', 0.85], [116.5, 7.5, 'small', 0.8],
  ];
  trees.forEach(([x, y, k, s], i) => S.push(new TreeItem(sprites, x, y, k, s, 80 + i * 1.3)));

  // the path: off the main path, onto the ring round the pond (the strollers' ring) on its south-west side, off it
  // on the north-east and on north to the north belt's path
  const IN = curve([[119, 27.5], [119.9, 21.5], [119.6, 13], [ring[4].x, ring[4].y]]);
  // north: up to the lake's south shore (lake.ts), round its east side and on to the belt's path
  const OUT = curve([
    [ring[9].x, ring[9].y], [128.4, -5.5], [126.3, -12], [125.6, -17.4], [128.4, -20.6], [133, -21.6], [136.9, -24],
    [137.9, -30], [137.6, -40], [137.5, -47],
  ]);
  const ground = (ctx: Ctx) => {
    ctx.strokeStyle = pal.plaza;
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const line of [IN, OUT]) for (let i = 1; i < line.length; i++) lineW(ctx, line[i - 1][0], line[i - 1][1], 0, line[i][0], line[i][1], 0);
    groundPoly(ctx, ellipse(fx, fy, 6.6, 5.0, 40));
    ctx.stroke();
    ctx.lineCap = 'butt';
    // the pond with a paved rim
    ctx.fillStyle = pal.water;
    ctx.strokeStyle = pal.plaza;
    ctx.lineWidth = 0.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    groundPoly(ctx, ellipse(POND.x, POND.y, POND.rx, POND.ry));
    ctx.fill();
    ctx.stroke();
  };

  const walks = (g: WalkGraph, from: number, to: number) => {
    const ids = ring.map((p) => g.node(p.x, p.y, false, 0.5));
    for (let i = 0; i < ids.length; i++) g.link(ids[i], ids[(i + 1) % ids.length]);
    // nodes every few points along the curves, so people follow them closely
    const along = (line: number[][]) => line.filter((_, i) => i > 0 && i < line.length - 1 && i % 3 === 0).map(([x, y]) => g.node(x, y, false, 0.5));
    g.chain([from, ...along(IN), ids[4]]);
    g.chain([ids[9], ...along(OUT), to]);
  };

  return { acts, ground, walks };
}
