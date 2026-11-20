// Street life: the pocket park, trees, hedges, lamps and benches, people standing together for a chat, and staff on
// their break in the parks (people only: no robots, no kids, no ball games).

import type { Sprites } from '../sprites';
import { BoxItem, HedgeItem, LampItem, TreeItem } from '../statics';
import { Walker } from '../people/walker';
import type { Env } from '../activities/activity';

// the pocket park on the corner between the compute platform, the plaza walk and the street: grass, a path, benches
export const POCKET_LAWN = [31.0, 38.2, 44.6, 38.2, 44.6, 44.2, 41.4, 47.8, 31.0, 47.8];
export const POCKET_PATH = [[36.2, 49.0], [37.4, 45.2], [40.6, 41.6], [45.2, 41.9]];
// the park by the robotaxi stop, south of the street and east of the avenue's pavement: grass, with the walk round
// the house's west side and along its garden (the walkways' `pk` nodes) paved across it
export const TAXI_LAWN = [82.4, 53.2, 131, 53.2, 131, 100, 82.4, 100];
export const TAXI_PATHS = [[[85.2, 53.2], [85.2, 65], [112, 65.6]], [[85.2, 65], [81.0, 68]]];

export function pocketParkBenches(env: Env, edge: string) {
  const { pal, statics: S } = env;
  for (const [x0, y0, x1, y1] of [[37.2, 39.0, 39.2, 39.5], [31.5, 42.4, 32.0, 44.4]]) S.push(new BoxItem(x0, y0, 0, x1, y1, 0.45, pal.white, { edge }));
}
/** Trees, hedges, lamps and benches along the streets and in the parks. */
export function streetFurniture(env: Env, sprites: Sprites, edge: string) {
  const { pal, statics: S } = env;
  const trees: [number, number, 'tree' | 'tree2' | 'poplar' | 'small', number][] = [
    [29.6, 66.4, 'tree', 1], [34.6, 69.0, 'tree2', 0.9], [27.6, 44.5, 'poplar', 0.9],
    [65.7, 33.0, 'poplar', 1], [65.7, -20.2, 'poplar', 1],
    [84.3, 56.6, 'tree', 1], [89.8, 63.4, 'tree2', 1], [99.5, 57.5, 'small', 1], [105.5, 52.6, 'tree', 1], [54.0, 82.6, 'small', 0.9],
    [53.2, 92.5, 'poplar', 0.9], [53.4, 103, 'tree2', 0.9], [31.0, 103.5, 'tree', 1], [31.2, 85.2, 'tree2', 0.95],
    [98.8, 40.0, 'tree2', 0.9], [110, 39.6, 'tree', 1], [78.8, 88.5, 'tree', 1],
    [66.3, 88.4, 'small', 0.9],
    // pocket park
    [31.9, 46.4, 'tree2', 0.85], [42.4, 45.4, 'small', 0.8], [31.8, 39.6, 'small', 0.75],
  ];
  trees.forEach(([x, y, k, s], i) => S.push(new TreeItem(sprites, x, y, k, s, i * 1.7)));
  const hedges: number[][] = [
    [30.4, 69.6, 34.6, 70.6], [54.7, 67.0, 55.3, 79.8], [80.6, 76.0, 81.2, 86.0],
    [80.8, 38.85, 85.6, 39.35], [91, 38.85, 96.6, 39.35],
  ];
  hedges.forEach((h, i) => S.push(new HedgeItem(sprites, h[0], h[1], h[2], h[3], pal.planter, i)));
  const lamps: number[][] = [
    [65.4, 2, 1.2, 0], [65.4, 31, 1.2, 0], [65.4, 58, 1.2, 0], [65.4, 92, 1.2, 0], [78.6, 22, -1.2, 0], [78.6, 92, -1.2, 0],
    [94, 39.4, 0, 1.2], [112, 39.4, 0, 1.2], [95.3, 52.6, 0, -1.2], [54.6, 88, -1.2, 0], [41.6, 58, 1.2, 0], [55.0, 39.4, 0, 1.2],
  ];
  for (const [x, y, ax, ay] of lamps) S.push(new LampItem(x, y, ax, ay, pal.steel, pal.factoryDark));
  for (const [x0, y0, x1, y1] of [[31.0, 62.6, 32.8, 63.1], [81.9, 69.2, 82.4, 71.0], [86.6, 60.9, 88.4, 61.4], [92.2, 57.4, 92.7, 59.2], [95.4, 57.0, 97.2, 57.5]]) {
    S.push(new BoxItem(x0, y0, 0, x1, y1, 0.45, pal.white, { edge }));
  }
}

/** People standing together for a chat, facing the middle of the group; `robots` is the chance each one is a robot. */
export function chat(env: Env, pts: number[][], robots = 0.5) {
  const { pal, rng, crowd } = env;
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  for (const [x, y] of pts) {
    const w = new Walker(rng() < robots ? 'robot' : 'person', pal, rng, x, y);
    w.face(cx - x, cy - y);
    w.stance = 'chat';
    crowd.add(w);
  }
}

/** Someone on a bench, facing (fx, fy). */
export function sit(env: Env, x: number, y: number, fx: number, fy: number) {
  const w = new Walker('person', env.pal, env.rng, x, y);
  w.stance = 'sit';
  w.face(fx, fy);
  env.crowd.add(w);
}

/** The parks are where staff take their break: on the benches, or standing together with a coffee (no robots). */
export function staffBreak(env: Env) {
  // pocket park by the compute platform
  sit(env, 37.7, 39.85, 0, 1);
  sit(env, 38.7, 39.85, 0, 1);
  sit(env, 32.35, 43.6, 1, 0);
  chat(env, [[33.9, 41.5], [34.9, 42.4]], 0);
  // the park by the robotaxi stop
  sit(env, 87.0, 61.75, 0, 1);
  sit(env, 87.95, 61.75, 0, 1);
  sit(env, 95.9, 57.85, 0, 1);
  sit(env, 93.05, 58.3, 1, 0);
  chat(env, [[93.4, 55.2], [94.5, 55.6], [93.8, 56.2]], 0);
}
