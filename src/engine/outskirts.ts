// The outskirts: what lies beyond the classic 1.86 : 1 frame, so a wide banner (say 1630 × 520 showing the whole
// height) has as much going on at its edges as in the middle.
//
//   west   the factory grows a wing in front of its west end, and a long staff car park under solar canopies runs
//          beside it, with a service road where a few cars come and go
//   east   a second compute platform and a Megapack field north-east of the avenue, a charging hub that cars turn
//          into off the northbound lane, and a park for staff on their break east of the pavilion

import type { Env } from './activities';
import { Looper } from './activities';
import { megapacks, rackPlatform } from './blocks';
import { solarGlint, solarRoof, windowsX, windowsY, type Band, type LitFace } from './details';
import { groundPoly, groundRect, lineW, type Ctx } from './draw';
import { BoxItem, TreeItem } from './statics';
import type { Sprites } from './sprites';
import { StallLot, type Stall } from './stalls';
import { sameKind, type Zone } from './vehicles';
import { Walker, type WalkGraph } from './walkers';

export interface Outskirts {
  acts: (StallLot | Looper)[];
  /** pavement crossing at the hub's driveway, for the walkway along the avenue */
  hubCrossing: Zone;
  /** glazed faces that light up the ground in front of them at night */
  litFaces: LitFace[];
  ground(ctx: Ctx): void;
  /** join the outskirts' walkways to the town's: the node by the home's side path, and the street walk at x 104 */
  walks(g: WalkGraph, houseNode: number, streetNode: number): void;
}

/** A row of stalls along x. */
const row = (xs: number[], y: number, dir: -1 | 1, live: number[]): Stall[] => xs.map((x) => ({ x, y, dir, isLive: live.includes(x) }));

/** A canopy on a post every two stalls, with solar glass on top. */
function canopy(env: Env, edge: string, x0: number, y0: number, x1: number, y1: number, postY: number, z = 2.7) {
  const { pal, statics: S } = env;
  S.push(
    new BoxItem(x0, y0, z - 0.22, x1, y1, z, pal.white, { edge }, (r) => solarRoof(r, pal, x0, y0, x1, y1, z, 0.3)).live((r) =>
      solarGlint(r, x0, y0, x1, y1, z, 0.3, x0 * 0.05 + y0 * 0.03),
    ),
  );
  for (let x = x0 + 0.3; x <= x1 - 0.2; x += 6) S.push(new BoxItem(x, postY, 0, x + 0.25, postY + 0.25, z - 0.22, pal.white));
  S.push(new BoxItem(x1 - 0.3, postY, 0, x1 - 0.05, postY + 0.25, z - 0.22, pal.white));
}

function staff(env: Env, x: number, y: number, stance: 'sit' | 'chat', fx: number, fy: number) {
  const w = new Walker('person', env.pal, env.rng, x, y);
  w.stance = stance;
  w.face(fx, fy);
  env.crowd.add(w);
}

export function buildOutskirts(env: Env, sprites: Sprites, edge: string): Outskirts {
  const { pal, traffic, statics: S } = env;
  const trees: [number, number, 'tree' | 'tree2' | 'poplar' | 'small', number][] = [];

  // ----------------------------------------------------------------------------------------------- factory wing
  const wingBands: Band[] = [{ top: 1.2, bot: 3.8, every: 1.5 }, { top: 5.2, bot: 7.8, every: 1.5 }];
  S.push(
    new BoxItem(-40, 72, 0, -6, 100, 9.5, pal.factory, { edge }, (r) => {
      windowsX(r, pal, -6, 72, 100, 9.5, wingBands);
      windowsY(r, pal, -40, -6, 100, 9.5, wingBands);
      solarRoof(r, pal, -40, 72, -6, 100, 9.5, 1.0, 2.6);
    }).live((r) => solarGlint(r, -40, 72, -6, 100, 9.5, 1.0, 0.3)),
  );

  // ----------------------------------------------------------------------------------------------- staff car park
  // five rows under solar canopies west of the home; the first two are the busy ones, served from a service road
  // along the wing (in on its east side, out on its west side)
  const xs = [1.5, 4.5, 7.5, 10.5, 13.5, 16.5];
  const carPark = new StallLot(env, {
    stalls: [
      ...row(xs, 79.2, -1, [7.5, 10.5]),
      ...row(xs, 90.4, 1, [7.5]),
      ...row(xs, 101, -1, []),
      ...row(xs, 112.2, 1, []),
      ...row(xs, 122.8, -1, []),
    ],
    laneIn: 86.2,
    laneOut: 83.6,
    waitX: 3,
    arrive: { pts: [[-1.8, 150], [-1.8, 86.2], [3, 86.2]], radii: [2.2] },
    depart: {
      clear: { pts: [[0.5, 83.6], [-4.2, 83.6], [-4.2, 98]], radii: [2.5] },
      away: { pts: [[-4.2, 98], [-4.2, 150]], radii: [] },
    },
    chargerGap: 0.35,
    role: 'park',
    every: [14, 26],
  });
  // where the service road meets the aisle, a car turning in and a car turning out take turns (their turns overlap)
  const parkMouth = traffic.zone(-6, 82.5, 0, 89.5, sameKind);
  parkMouth.keyOf = (_v, leg) => leg.tag ?? 'car';
  for (const [y0, y1, post] of [[76.2, 79.4, 76.3], [90.2, 93.4, 93.1], [98, 101.2, 98.1], [112, 115.2, 114.9], [119.8, 123, 119.9]]) {
    canopy(env, edge, -0.2, y0, 18.2, y1, post);
  }
  trees.push([21.5, 96.5, 'tree', 0.9], [-3, 74.6, 'poplar', 0.9], [21, 108, 'tree2', 0.9], [21.4, 121, 'small', 0.9]);

  // ----------------------------------------------------------------------------------------------- charging hub
  // ten stalls in two rows either side of an aisle along y 11–14.6; cars come in off the avenue's northbound lane
  // with a right turn and leave with another, so they never cross the southbound lane. The north row sits a metre
  // back from the aisle, so a car reversing out of the south row swings its tail clear of the cars parked there.
  // The driveway: people on the pavement, a car turning in and a car turning out each take turns (their corners
  // swing across each other's lane mid-turn).
  const hubCrossing = traffic.zone(75.8, 7.6, 79.4, 16.4, sameKind);
  hubCrossing.keyOf = (_v, leg) => leg.tag ?? 'car';
  // a car leaving waits here for a gap in the northbound lane
  const merge = traffic.zone(72, 4, 76, 13, (a, b) => a === b && a !== 'hub');
  merge.keyOf = (v) => (v.role === 'hub' ? 'hub' : 'car');
  merge.yieldKey = 'hub';
  merge.yieldToQueue = false;
  const hub = new StallLot(env, {
    stalls: [...row([83, 86, 89, 92, 95], 6.4, -1, [86, 92]), ...row([83, 86, 89, 92, 95], 18, 1, [89, 95])],
    laneIn: 14,
    laneOut: 11.2,
    waitX: 82.6,
    arrive: { pts: [[74, 112], [74, 14], [82.6, 14]], radii: [3.5] },
    depart: {
      clear: { pts: [[80.5, 11.2], [74, 11.2], [74, 4]], radii: [2.5] },
      away: { pts: [[74, 4], [74, -18]], radii: [] },
    },
    chargerGap: 0.35,
    role: 'hub',
    every: [6, 12],
  });
  canopy(env, edge, 81.3, 2.5, 97.4, 5.7, 2.7, 2.9);
  canopy(env, edge, 81.3, 18.7, 97.4, 21.9, 21.5, 2.9);
  trees.push([99.6, 6, 'tree2', 0.9], [99.8, 17.5, 'tree', 0.9]);

  // ----------------------------------------------------------------------------------------------- compute and grid storage
  // a second compute platform north of the hub, and a Megapack field behind it, with a robot doing its rounds
  rackPlatform(S, pal, edge, { x0: 80, y0: -15.2, x1: 100.2, y1: -2.4 }, 5, 5, 200);
  megapacks(S, pal, edge, [[79.6, 85.4], [87, 92.8], [94.4, 100.2]], [-19.4, -22.2, -25, -27.8, -30.6, -33.4], 300);
  const rounds = new Looper(env, 'robot', () => [{ x: 80.6, y: -17.3, wait: 3 }, { x: 99.6, y: -17.3, wait: 4 }, { x: 101.4, y: -9, wait: 3 }], 80.6, -17.3);
  trees.push([78.9, 1.0, 'tree2', 1], [77.9, -12, 'poplar', 1], [77.9, -24, 'poplar', 1]);

  // ----------------------------------------------------------------------------------------------- staff park
  // east of the pavilion: grass with a path across it, trees, benches, and people on their break
  const lawn = [101.5, 16.5, 131, 16.5, 136.5, 21, 136.5, 38.2, 101.5, 38.2];
  const path = [[104, 40.6], [110, 32], [122, 26], [137, 19.5]];
  for (const [x0, y0, x1, y1] of [[109.5, 24.2, 111.3, 24.7], [125.6, 31.2, 127.4, 31.7], [113.4, 35, 113.9, 36.8]]) S.push(new BoxItem(x0, y0, 0, x1, y1, 0.45, pal.white, { edge }));
  staff(env, 110, 25.05, 'sit', 0, 1);
  staff(env, 110.9, 25.05, 'sit', 0, 1);
  staff(env, 126.1, 32.05, 'sit', 0, 1);
  staff(env, 114.25, 35.9, 'sit', 1, 0);
  for (const group of [[[114.6, 27.6], [115.7, 28.1], [114.9, 28.9]], [[130.5, 24.8], [131.5, 25.4]]]) {
    const cx = group.reduce((a, p) => a + p[0], 0) / group.length, cy = group.reduce((a, p) => a + p[1], 0) / group.length;
    for (const [x, y] of group) staff(env, x, y, 'chat', cx - x, cy - y);
  }
  trees.push([105.5, 20, 'tree', 1], [116.5, 19, 'tree2', 0.95], [129, 31.5, 'tree', 1], [119.5, 35.5, 'small', 0.9], [134, 35, 'tree2', 0.9], [103.5, 31, 'small', 0.85]);

  trees.forEach(([x, y, k, s], i) => S.push(new TreeItem(sprites, x, y, k, s, 40 + i * 1.3)));

  const ground = (ctx: Ctx) => {
    ctx.fillStyle = pal.pad;
    ctx.beginPath();
    groundRect(ctx, 79.4, 1.6, 101, 22.4);
    groundRect(ctx, 76, 9.4, 79.4, 16.2);
    groundRect(ctx, 78.8, -35.6, 101, -18.6);
    groundRect(ctx, -6, 75.4, 19.2, 126);
    ctx.fill();
    // the car park's service road
    ctx.fillStyle = pal.road;
    ctx.beginPath();
    groundRect(ctx, -5.8, 82.2, -0.2, 160);
    ctx.fill();
    // grass and its path
    ctx.fillStyle = pal.lawn;
    ctx.strokeStyle = pal.lawn;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    groundPoly(ctx, lawn);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = pal.plaza;
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 1; i < path.length; i++) lineW(ctx, path[i - 1][0], path[i - 1][1], 0, path[i][0], path[i][1], 0);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // stall lines
    ctx.strokeStyle = pal.roadLine;
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    for (const x of [81.5, 84.5, 87.5, 90.5, 93.5, 96.5]) {
      lineW(ctx, x, 3.6, 0, x, 9, 0);
      lineW(ctx, x, 15.4, 0, x, 20.8, 0);
    }
    for (const x of [0, 3, 6, 9, 12, 15, 18]) {
      for (const [y0, y1] of [[76.6, 82], [87.8, 93.2], [98.4, 103.8], [109.6, 115], [120.2, 125.6]]) lineW(ctx, x, y0, 0, x, y1, 0);
    }
    ctx.stroke();
  };

  const walks = (g: WalkGraph, houseNode: number, streetNode: number) => {
    // from the south end of the car park up its east side to the home's side path, clear of the reversing cars
    g.chain([g.node(19.5, 130, true), g.node(19.5, 96, false, 0.4), g.node(19.2, 74.6, false, 0.4), g.node(27.2, 74.0), houseNode]);
    // across the staff park from the street walk to its far corner
    const ids = path.slice(1).map(([x, y], i) => g.node(x, y, i === path.length - 2));
    g.chain([streetNode, ...ids]);
  };

  const litFaces: LitFace[] = [[-6, 72, -6, 100, 1, 0], [-40, 100, -6, 100, 0, 1]];
  return { acts: [carPark, hub, rounds], hubCrossing, litFaces, ground, walks };
}
