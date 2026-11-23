// The east side, past the staff park: a second road parallel to the avenue (x 142–150) that crosses the street at
// a junction of its own, with through traffic both ways and cars turning to and from the street; beyond it an
// office and a charging hub, the hub shaped like the one off the avenue (outskirts.ts) and served the same way, off
// the road's northbound lane. Only the strip within the world box (frame.ts `WORLD`) shows: about x 150–180,
// y −8…35, north of the street. Everything here draws from a random stream of its own, so the rest of the town
// plays out as before.

import type { Env } from '../activities/activity';
import { StallLot } from '../activities/stallLot';
import { windowsX, windowsY, type Band, type LitFace } from '../details';
import type { Ctx } from '../draw';
import { groundRect, lineW } from '../ground';
import type { WalkGraph } from '../people/crowd';
import type { Sprites } from '../sprites';
import { BoxItem, LampItem, TreeItem } from '../statics';
import { junction, sameKind } from '../traffic/zone';
import { junctionCorners } from './groundPlan';
import { canopy } from './outskirts';
import { spawner, type Route } from './roads';
import { solarRows } from './solarRows';

export interface EastSide {
  acts: StallLot[];
  /** through traffic on the east road; call every step */
  spawn(dt: number): void;
  /** the road's outline, added to the town's road path (it is filled and kerbed with the rest) */
  road(ctx: Ctx): void;
  /** paved pads under the hub and the path to the office door */
  ground(ctx: Ctx): void;
  /** lane, stop and zebra markings */
  marks(ctx: Ctx): void;
  litFaces: LitFace[];
  /** pavements both sides of the road, joined to the street's pavements and the staff park's path */
  walks(g: WalkGraph, ends: { north: number; south: number; park: number }): void;
}

// the road, its lanes and where people cross it
const X0 = 142, X1 = 150, SB = 144, NB = 148;
const WEST = X0 - 1.5, EAST = X1 + 1.5;
const OFFICE = { x0: 157, y0: -6, x1: 175, y1: 10, h: 7.6 };

export function buildEastSide(env: Env, sprites: Sprites, edge: string, density: number): EastSide {
  const { pal, traffic, statics: S } = env;

  // the junction with the street, and the zebra crossings north and south of it (6 m off, like the avenue's)
  const J2 = traffic.zone(X0, 42, X1, 50, junction);
  J2.phases = ['NS', 'EW'];
  const north = traffic.zone(X0, 33, X1, 36, sameKind);
  const south = traffic.zone(X0, 56, X1, 59, sameKind);

  // through traffic, on routes that start and end outside the world box
  const routes: Route[] = [
    { pts: [[SB, -120], [SB, 175]], r: [], w: 2 },
    { pts: [[NB, 175], [NB, -120]], r: [], w: 2 },
    { pts: [[SB, -120], [SB, 44], [46, 44], [46, 200]], r: [2, 10], w: 0.6 },
    { pts: [[SB, -120], [SB, 48], [230, 48]], r: [6], w: 0.4 },
    { pts: [[NB, 175], [NB, 48], [230, 48]], r: [2], w: 0.5 },
    { pts: [[NB, 175], [NB, 44], [46, 44], [46, 200]], r: [6, 10], w: 0.4 },
    { pts: [[230, 44], [NB, 44], [NB, -120]], r: [2], w: 0.5 },
    { pts: [[230, 44], [SB, 44], [SB, 175]], r: [6], w: 0.4 },
    { pts: [[50, 200], [50, 48], [SB, 48], [SB, 175]], r: [6, 2], w: 0.3 },
    { pts: [[50, 200], [50, 48], [NB, 48], [NB, -120]], r: [6, 6], w: 0.3 },
  ];
  const spawn = spawner(env, env.rng, routes, Math.round(7 * density));

  // the office: two storeys of ribbon windows, solar rows on the roof
  const bands: Band[] = [{ top: 1.2, bot: 3.3, every: 1.5 }, { top: 4.6, bot: 6.7, every: 1.5 }];
  const o = OFFICE;
  S.push(
    new BoxItem(o.x0, o.y0, 0, o.x1, o.y1, o.h, pal.factory, { edge }, (r) => {
      windowsX(r, pal, o.x1, o.y0, o.y1, o.h, bands);
      windowsY(r, pal, o.x0, o.x1, o.y1, o.h, bands);
    }),
    ...solarRows(pal, { x0: o.x0, y0: o.y0, x1: o.x1, y1: o.y1, z: o.h, inset: 1.0 }),
  );

  // the charging hub: ten stalls either side of an aisle along y 23–26.6, in off the northbound lane with a right
  // turn and out with another, like the avenue's hub; the driveway is taken in turns by people on the pavement and
  // cars turning in and out, and a car leaving waits for a gap in the lane
  const crossing = traffic.zone(149.8, 19.6, 153.4, 28.4, sameKind);
  crossing.keyOf = (_v, leg) => leg.tag ?? 'car';
  const merge = traffic.zone(146, 16, 150, 25, (a, b) => a === b && a !== 'east');
  merge.keyOf = (v) => (v.role === 'east' ? 'east' : 'car');
  merge.yieldKey = 'east';
  merge.yieldToQueue = false;
  const xs = [157, 160, 163, 166, 169];
  const hub = new StallLot(env, {
    stalls: [...xs.map((x) => ({ x, y: 18.4, dir: -1 as const, isLive: x === 160 || x === 166 })), ...xs.map((x) => ({ x, y: 30, dir: 1 as const, isLive: x === 163 }))],
    laneIn: 26,
    laneOut: 23.2,
    waitX: 156.6,
    arrive: { pts: [[NB, 175], [NB, 26], [156.6, 26]], radii: [3.5] },
    depart: {
      clear: { pts: [[154.5, 23.2], [NB, 23.2], [NB, 16]], radii: [2.5] },
      away: { pts: [[NB, 16], [NB, -120]], radii: [] },
    },
    chargerGap: 0.35,
    role: 'east',
    every: [10, 18],
  });
  canopy(env, edge, 155.3, 14.5, 171.4, 17.7, 14.7, 2.9);
  canopy(env, edge, 155.3, 30.7, 171.4, 33.9, 33.5, 2.9);

  // trees round the office and the hub, lamps along both pavements
  const trees: [number, number, 'tree' | 'tree2' | 'poplar' | 'small', number][] = [
    [177, -3, 'tree2', 0.95], [177.5, 6.5, 'poplar', 0.9], [176.5, 19, 'tree', 1], [176, 31, 'tree2', 0.9],
    [153.5, -4, 'small', 0.85], [153.5, 4.5, 'poplar', 0.85], [173.5, 37.5, 'small', 0.85], [158, 37.6, 'tree', 0.9],
  ];
  trees.forEach(([x, y, k, s], i) => S.push(new TreeItem(sprites, x, y, k, s, 60 + i * 1.3)));
  for (const [x, y, ax] of [[139.4, 4, 1.2], [139.4, 30, 1.2], [139.4, 62, 1.2], [152.6, -2, -1.2], [152.6, 38, -1.2]]) {
    S.push(new LampItem(x, y, ax, 0, pal.steel, pal.factoryDark));
  }

  const road = (ctx: Ctx) => {
    groundRect(ctx, X0, -180, X1, 260);
    junctionCorners(ctx, X0, 42, X1, 50);
  };

  const ground = (ctx: Ctx) => {
    ctx.fillStyle = pal.pad;
    ctx.beginPath();
    groundRect(ctx, 153.4, 13.6, 175, 34.4);
    groundRect(ctx, 150, 21.4, 153.4, 28.2);
    ctx.fill();
    // the path from the pavement to the office door
    ctx.strokeStyle = pal.plaza;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    lineW(ctx, EAST, 11.2, 0, 165, 11.2, 0);
    ctx.stroke();
  };

  const marks = (ctx: Ctx) => {
    ctx.strokeStyle = pal.roadLine;
    ctx.lineWidth = 0.15;
    ctx.setLineDash([2.2, 2.6]);
    ctx.beginPath();
    lineW(ctx, 146, -180, 0, 146, 41.2, 0);
    lineW(ctx, 146, 50.8, 0, 146, 260, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    // stop lines at the junction
    ctx.lineWidth = 0.28;
    ctx.beginPath();
    lineW(ctx, 142.3, 41.2, 0, 145.8, 41.2, 0);
    lineW(ctx, 146.2, 50.8, 0, 149.7, 50.8, 0);
    lineW(ctx, 141.4, 46.2, 0, 141.4, 49.7, 0);
    lineW(ctx, 150.6, 42.3, 0, 150.6, 45.8, 0);
    ctx.stroke();
    // zebras, and the hub's stall lines
    ctx.fillStyle = pal.roadLine;
    ctx.beginPath();
    for (let x = 142.4; x < 149.7; x += 0.9) {
      groundRect(ctx, x, 33.25, x + 0.45, 35.75);
      groundRect(ctx, x, 56.25, x + 0.45, 58.75);
    }
    ctx.fill();
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    for (const x of [155.5, 158.5, 161.5, 164.5, 167.5, 170.5]) {
      lineW(ctx, x, 15.6, 0, x, 21, 0);
      lineW(ctx, x, 27.4, 0, x, 32.8, 0);
    }
    ctx.stroke();
  };

  const litFaces: LitFace[] = [[o.x1, o.y0, o.x1, o.y1, 1, 0], [o.x0, o.y1, o.x1, o.y1, 0, 1]];

  const walks = (g: WalkGraph, ends: { north: number; south: number; park: number }) => {
    // west pavement: from beyond the north edge down past the staff park's path to the street corner, and on south
    // of the street past the bottom edge; people cross the road at the zebras
    const w = [g.node(WEST, -120, true), g.node(WEST, 18), g.node(WEST, 34.5), g.node(WEST, 40.5)];
    g.chain(w);
    g.link(ends.park, w[1]);
    g.link(ends.north, w[3]);
    const ws = [g.node(WEST, 51.5), g.node(WEST, 57.5), g.node(WEST, 175, true)];
    g.chain(ws);
    g.link(ends.south, ws[0]);
    // east pavement, past the office door and over the hub's driveway (in turns with the cars)
    const door = g.node(165, 11.2, true);
    const e = [g.node(EAST, -120, true), g.node(EAST, 11.2), g.node(EAST + 0.3, 18.8, false, 0.5)];
    g.chain(e);
    g.link(door, e[1]);
    const e2 = [g.node(EAST + 0.3, 29.4, false, 0.5), g.node(EAST, 34.5), g.node(EAST, 40.5), g.node(230, 40.5, true)];
    g.link(e[2], e2[0], crossing);
    g.chain(e2);
    // south of the street, the east pavement runs from the zebra out east past the edge
    const es = [g.node(EAST, 57.5), g.node(EAST, 51.5), g.node(230, 51.5, true)];
    g.chain(es);
    g.link(w[2], e2[1], north);
    g.link(ws[1], es[0], south);
  };

  return { acts: [hub], spawn, road, ground, marks, litFaces, walks };
}
