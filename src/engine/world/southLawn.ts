// The park south of the street, between the robotaxi stop and the east road (its lawn and garden walk are
// TAXI_LAWN and TAXI_PATHS in streetLife.ts): a café kiosk with a lit window and an awning, tables with staff at
// them, a short queue at the counter, benches and trees. The kiosk's door is
// a portal of the walkway graph, so people come and go. A random stream of its own keeps the rest of the town as it
// was.

import type { Activity, Env } from '../activities/activity';
import { box, type Ctx, type R } from '../draw';
import { windowsY, type Band } from '../details';
import { lineW } from '../ground';
import type { WalkGraph } from '../people/crowd';
import { Walker } from '../people/walker';
import type { Sprites } from '../sprites';
import { BoxItem, FnItem, TreeItem } from '../statics';

export interface SouthLawn {
  acts: Activity[];
  ground(ctx: Ctx): void;
  /** the path from the garden walk to the kiosk's door: `from` and `to` are the walk's nodes either side */
  walks(g: WalkGraph, from: number, to: number): void;
}

// just south of the street, between it and the garden walk, where it shows above the look page's lower fade
const KIOSK = { x0: 104, y0: 55, x1: 109, y1: 58.2, h: 3 };
const DOOR = { x: 106.5, y: 58.7 };
/** where the kiosk's path meets the garden walk */
const FORK = { x: 106.5, y: 66.3 };
// either side of the kiosk's path, clear of it and of the garden walk
const TABLES = [[102.2, 60.4], [102.8, 63.2], [110.8, 60.4], [110.4, 63.2]];

export function buildSouthLawn(env: Env, sprites: Sprites, edge: string): SouthLawn {
  const { pal, statics: S } = env;
  const person = (x: number, y: number, stance: 'sit' | 'stand' | 'chat', fx: number, fy: number) => {
    const w = new Walker('person', pal, env.rng, x, y);
    w.stance = stance;
    w.face(fx, fy);
    env.crowd.add(w);
  };

  // the kiosk: a lit band of glass along its counter side, under an awning
  const k = KIOSK;
  const bands: Band[] = [{ top: 0.7, bot: 2.2, every: 1.2 }];
  S.push(
    new BoxItem(k.x0, k.y0, 0, k.x1, k.y1, k.h, pal.factory, { edge }, (r) => windowsY(r, pal, k.x0, k.x1, k.y1, k.h, bands)),
    new BoxItem(k.x0 - 0.2, k.y1, 2.45, k.x1 + 0.2, k.y1 + 1.1, 2.6, pal.white, { edge }),
  );

  // plain white tables on a steel stem, with staff at them
  TABLES.forEach(([x, y], i) => {
    S.push(new FnItem(x - 0.45, y - 0.45, 0, x + 0.45, y + 0.45, 0.8, (r) => table(r, x, y)).still());
    person(x - 0.95, y, 'sit', 1, 0);
    if (i !== 1) person(x + 0.95, y, 'sit', -1, 0);
  });
  const table = (r: R, x: number, y: number) => {
    box(r, x - 0.06, y - 0.06, 0, x + 0.06, y + 0.06, 0.7, pal.steel);
    box(r, x - 0.4, y - 0.4, 0.7, x + 0.4, y + 0.4, 0.76, pal.white, { edge });
  };

  // a short queue at the counter, and staff on two benches
  person(106.2, 59.6, 'stand', 0, -1);
  person(106.8, 60.5, 'stand', 0, -1);
  for (const [x0, y0] of [[113.6, 77.4], [89.2, 79.4]]) {
    S.push(new BoxItem(x0, y0, 0, x0 + 1.8, y0 + 0.5, 0.45, pal.white, { edge }));
    person(x0 + 0.5, y0 + 0.85, 'sit', 0, 1);
    person(x0 + 1.3, y0 + 0.85, 'sit', 0, 1);
  }

  const trees: [number, number, 'tree' | 'tree2' | 'poplar' | 'small', number][] = [
    [88, 76.5, 'tree', 1], [91.5, 84, 'tree2', 0.95], [86, 91, 'small', 0.9], [112, 82, 'tree', 1], [117, 73.5, 'small', 0.85],
    [121, 83, 'tree2', 1], [124, 71.5, 'poplar', 0.9], [109, 92, 'tree', 1], [97, 93, 'tree2', 0.9], [118, 96, 'small', 0.9],
    [133, 60, 'tree', 1], [135.5, 72, 'tree2', 0.95], [136.5, 86, 'poplar', 0.9], [133, 101, 'tree', 1], [122, 106, 'small', 0.85],
  ];
  trees.forEach(([x, y, kind, s], i) => S.push(new TreeItem(sprites, x, y, kind, s, 100 + i * 1.3)));

  const ground = (ctx: Ctx) => {
    ctx.strokeStyle = pal.plaza;
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    lineW(ctx, FORK.x, FORK.y, 0, DOOR.x, DOOR.y - 0.2, 0);
    ctx.stroke();
    ctx.lineCap = 'butt';
  };

  const walks = (g: WalkGraph, from: number, to: number) => {
    const fork = g.node(FORK.x, FORK.y);
    g.link(from, fork);
    g.link(fork, to);
    g.link(fork, g.node(DOOR.x, DOOR.y, true, 0.4));
  };

  return { acts: [], ground, walks };
}
