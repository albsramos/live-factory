// The north belt: along the top of wide, zoomed-out views, north of the truck yard, the Megapacks and the staff
// park, a strip of lawn with rows of trees and a path along y −47. West of the avenue the path runs from the avenue's
// pavement out past the top-left of every view; east of it, from the avenue's other pavement to the east road's.
// It never crosses the avenue, so it needs no zone. Two benches with staff on them. Trees are placed from a random
// stream of its own, so the rest of the town plays out as before.

import type { Env } from '../activities/activity';
import { rr } from '../core';
import type { Ctx } from '../draw';
import { groundPoly, groundRect, lineW } from '../ground';
import type { WalkGraph } from '../people/crowd';
import { Walker } from '../people/walker';
import type { Sprites } from '../sprites';
import { BoxItem, TreeItem } from '../statics';

export interface NorthBelt {
  ground(ctx: Ctx): void;
  /**
   * The path: `west` and `east` are the avenue's pavement nodes at y −47, `eastRoad` the east road's. Returns the
   * node at x 133 where the staff park's path comes up from the south.
   */
  walks(g: WalkGraph, ends: { west: number; east: number; eastRoad: number }): number;
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
    // and clear of the staff park's path, which comes up from the south at x 133
    if (y > -50 && Math.abs(x - 133) < 2.4) continue;
    S.push(new TreeItem(sprites, x, y, kind, s, 120 + i++ * 1.3));
  }

  // benches on the path's north side, with staff sitting on them facing south
  for (const x0 of [48, 92, 117]) {
    S.push(new BoxItem(x0, BELT_Y - 2.6, 0, x0 + 1.8, BELT_Y - 2.1, 0.45, pal.white, { edge }));
    for (const dx of [0.5, 1.3]) {
      if (x0 === 117 && dx > 1) continue;
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

  const walks = (g: WalkGraph, ends: { west: number; east: number; eastRoad: number }) => {
    // west: out past the top-left edge of every view (frame.ts `WORLD`)
    g.chain([ends.west, g.node(52, BELT_Y), g.node(36, BELT_Y), g.node(-40, BELT_Y, true)]);
    const park = g.node(133, BELT_Y);
    g.chain([ends.east, g.node(96, BELT_Y), g.node(120, BELT_Y), park, ends.eastRoad]);
    return park;
  };

  return { ground, walks };
}
