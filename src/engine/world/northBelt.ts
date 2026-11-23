// The north belt: along the top of wide, zoomed-out views, north of the truck yard, the Megapacks and the staff
// park, a strip of lawn with rows of trees and a path along y −47. West of the avenue the path runs from the avenue's
// pavement out past the top-left of every view; east of it, from the avenue's other pavement to the east road's.
// It never crosses the avenue; it crosses the car carriers' two service roads at zebras (activities/carrierYard.ts).
// Two benches with staff on them. Trees are placed from a random stream of its own, so the rest of the town plays
// out as before.

import type { Env } from '../activities/activity';
import { rr } from '../core';
import type { Ctx } from '../draw';
import { groundPoly, groundRect, lineW } from '../ground';
import type { WalkGraph } from '../people/crowd';
import { Walker } from '../people/walker';
import type { Sprites } from '../sprites';
import { BoxItem, TreeItem } from '../statics';
import { PAD } from './stuntPad';
import { EXIT_X, ROAD_X } from '../activities/carrierYard';
import type { Zone } from '../traffic/zone';

export interface NorthBelt {
  ground(ctx: Ctx): void;
  /**
   * The path: `west` and `east` are the avenue's pavement nodes at y −47, `eastRoad` the east road's. Returns the
   * node at x 137.5 where the staff park's path comes up from the south.
   */
  walks(g: WalkGraph, ends: { west: number; east: number; eastRoad: number }, roads: [Zone, Zone]): number;
}

export const BELT_Y = -47;
const KINDS = ['tree', 'tree2', 'poplar', 'small'] as const;

export function buildNorthBelt(env: Env, sprites: Sprites, edge: string): NorthBelt {
  const { pal, statics: S, rng } = env;

  // rows of trees either side of the path, jittered so they read as planted but not ruled; only where a view can
  // reach (a tree's crown rises a few metres above its foot, so a little past the top edge too)
  const spots: [number, number][] = [];
  for (const [xa, xb] of [[32, 63], [82, 138]]) {
    for (let x = xa; x <= xb; x += 5) {
      for (const y of [-43, -52, -58, -64, -70]) spots.push([x + rr(rng, -1.4, 1.4), y + rr(rng, -1.2, 1.2)]);
    }
  }
  let i = 0;
  for (const [x, y] of spots) {
    const kind = KINDS[Math.floor(rng() * KINDS.length)];
    const s = rr(rng, 0.8, 1.05);
    if (x + y < -18) continue;
    // keep the south row clear of the yard's fence line and the Megapacks' pad
    if (y > -44.5 && x > 77 && x < 103) continue;
    // and clear of the staff park's path, which comes up from the south at x 137.5, and of the lake (lake.ts)
    if (y > -50 && Math.abs(x - 137.5) < 2.4) continue;
    if (y > -42 && x > 103 && x < 137) continue;
    // and of the car carriers' service road (carrierYard.ts)
    if (Math.abs(x - ROAD_X) < 4.4 || (x > EXIT_X - 7 && x < EXIT_X + 4.4)) continue;
    // and of where their trailers cut the corners into the yard's lanes
    if (y > -45 && x < 64) continue;
    // and of the stunt pad's clearing (stuntPad.ts)
    if (x > PAD.x0 - 2.5 && x < PAD.x1 + 2.5 && y > PAD.y0 - 2.5 && y < PAD.y1 + 1.5) continue;
    S.push(new TreeItem(sprites, x, y, kind, s, 120 + i++ * 1.3));
  }

  // benches on the path's north side, with staff sitting on them facing south
  for (const x0 of [48, 108, 124]) {
    S.push(new BoxItem(x0, BELT_Y - 2.6, 0, x0 + 1.8, BELT_Y - 2.1, 0.45, pal.white, { edge }));
    for (const dx of [0.5, 1.3]) {
      if (x0 === 124 && dx > 1) continue;
      const w = new Walker('person', pal, rng, x0 + dx, BELT_Y - 1.75);
      w.stance = 'sit';
      w.face(0, 1);
      env.crowd.add(w);
    }
  }

  const ground = (ctx: Ctx) => {
    ctx.fillStyle = pal.lawn;
    ctx.strokeStyle = pal.lawn;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    groundRect(ctx, 28, -76, 64.6, -41);
    groundPoly(ctx, [79.6, -76, 139.6, -76, 139.6, -22, 102.9, -22, 102.9, -41, 79.6, -41]);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = pal.plaza;
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    lineW(ctx, -40, BELT_Y, 0, 66.5, BELT_Y, 0);
    lineW(ctx, 77.5, BELT_Y, 0, 140.5, BELT_Y, 0);
    ctx.stroke();
    ctx.lineCap = 'butt';
  };

  const walks = (g: WalkGraph, ends: { west: number; east: number; eastRoad: number }, roadZones: [Zone, Zone]) => {
    // west: out past the top-left edge of every view (frame.ts `WORLD`)
    // across the car carriers' two service roads (activities/carrierYard.ts) at zebras
    const east = [g.node(55.2, BELT_Y), g.node(38.6, BELT_Y)];
    const west = g.node(29.4, BELT_Y);
    g.link(ends.west, east[0], roadZones[0]);
    g.link(east[0], east[1]);
    g.link(east[1], west, roadZones[1]);
    g.link(west, g.node(-40, BELT_Y, true));
    const park = g.node(137.5, BELT_Y);
    g.chain([ends.east, g.node(96, BELT_Y), g.node(120, BELT_Y), park, ends.eastRoad]);
    return park;
  };

  return { ground, walks };
}
