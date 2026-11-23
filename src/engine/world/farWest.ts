// The far west, the left edge of wide, zoomed-out views: a second staff car park west of the service road, under
// solar canopies, its cars parked and charging, with someone walking between them; a lawn with rows of trees west of
// the factory and south of both car parks, out to the edge of the world box (frame.ts `WORLD`). Most of it sits
// under the look page's gradient behind the title, so it is texture more than a scene. A random stream of its own
// keeps the rest of the town as it was.

import type { Activity, Env } from '../activities/activity';
import { Looper } from '../activities/looper';
import { StallLot } from '../activities/stallLot';
import { rr } from '../core';
import type { Ctx } from '../draw';
import { groundPoly, groundRect, lineW } from '../ground';
import type { Sprites } from '../sprites';
import { TreeItem } from '../statics';
import { canopy } from './outskirts';

export interface FarWest {
  acts: Activity[];
  ground(ctx: Ctx): void;
}

const XS = [-36.5, -33.5, -30.5, -27.5, -24.5, -21.5, -18.5, -15.5, -12.5];
/** rows of stalls: y, and which way the cars face */
const ROWS: [number, -1 | 1][] = [[107.2, -1], [118.4, 1], [129, -1]];
const KINDS = ['tree', 'tree2', 'poplar', 'small'] as const;
/** lawn west of the factory and its wing, and south of both car parks */
const LAWNS = [
  [-92, 28, -41.5, 28, -41.5, 102.6, -40.2, 102.6, -40.2, 200, -92, 200],
  [-40.2, 134, -6.2, 134, -6.2, 200, -40.2, 200],
  [0.2, 127, 19.2, 127, 19.2, 200, 0.2, 200],
];

export function buildFarWest(env: Env, sprites: Sprites, edge: string): FarWest {
  const { statics: S, rng, pal } = env;

  // the car park: every car stays, charging, so it needs no way in or out (the plan's routes are never used)
  new StallLot(env, {
    stalls: ROWS.flatMap(([y, dir]) => XS.map((x) => ({ x, y, dir, isLive: false }))),
    laneIn: 0,
    laneOut: 0,
    waitX: 0,
    arrive: { pts: [[-3, 300], [-3, 290]], radii: [] },
    depart: { clear: { pts: [[-3, 290], [-3, 300]], radii: [] }, away: { pts: [[-3, 300], [-3, 310]], radii: [] } },
    chargerGap: 0.35,
    role: 'west',
    every: [1e9, 1e9],
  });
  for (const [y, dir] of ROWS) {
    if (dir < 0) canopy(env, edge, -39.2, y - 3, -9.6, y + 0.2, y - 2.9);
    else canopy(env, edge, -39.2, y - 0.2, -9.6, y + 3, y + 2.7);
  }
  // someone going to their car and back: along the first aisle, up the east end (between the second row's chargers
  // and the canopies' last posts) and along the second
  const walk = new Looper(env, 'person', () => [
    { x: -10.6, y: 112.8 }, { x: -10.6, y: 123.7 }, { x: -30, y: 123.7, wait: 2 }, { x: -10.6, y: 123.7 }, { x: -10.6, y: 112.8 }, { x: -34, y: 112.8, wait: 3 },
  ], -34, 112.8);

  // trees in loose rows on the lawns, only where some view can reach
  let i = 0;
  const plant = (x0: number, x1: number, y0: number, y1: number, step: number) => {
    for (let x = x0; x <= x1; x += step) {
      for (let y = y0; y <= y1; y += step + 1) {
        const x2 = x + rr(rng, -1.6, 1.6), y2 = y + rr(rng, -1.6, 1.6);
        const kind = KINDS[Math.floor(rng() * KINDS.length)], s = rr(rng, 0.8, 1.05);
        if (x2 - y2 < -185 || x2 + y2 > 210 || x2 + y2 < -14) continue;
        S.push(new TreeItem(sprites, x2, y2, kind, s, 160 + i++ * 1.3));
      }
    }
  };
  plant(-88, -46, 32, 136, 6);
  plant(-36, -10, 139, 170, 6);
  plant(3, 16, 131, 180, 6.5);

  const ground = (ctx: Ctx) => {
    ctx.fillStyle = pal.lawn;
    ctx.strokeStyle = pal.lawn;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const l of LAWNS) groundPoly(ctx, l);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pal.pad;
    ctx.beginPath();
    groundRect(ctx, -40, 103.4, -6.4, 133);
    ctx.fill();
    // stall lines
    ctx.strokeStyle = pal.roadLine;
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    for (const [y, dir] of ROWS) {
      const [a, b] = dir < 0 ? [y - 2.6, y + 2.8] : [y - 2.8, y + 2.6];
      for (let x = -38; x <= -11; x += 3) lineW(ctx, x, a, 0, x, b, 0);
    }
    ctx.stroke();
  };

  return { acts: [walk], ground };
}
