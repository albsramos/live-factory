// The road network's rules and its through traffic: the zones vehicles reserve, and the cars that come and go on
// the avenue and the street (semis only come for the yard and the loading bay).

import { pick, rr, type Rng } from '../core';
import { Path } from '../path';
import type { VehicleKind } from '../traffic/meshes';
import type { Traffic } from '../traffic/traffic';
import type { Vehicle } from '../traffic/vehicle';
import { junction, sameKind } from '../traffic/zone';
import type { Env } from '../activities/activity';
import { LANE_Y, PAST } from '../activities/carrierDepot';

/** Zones the traffic reserves: the junction, the crosswalks, the stretches semis need to themselves, the pavements they cross. */
export function roadZones(traffic: Traffic) {
  const J = traffic.zone(68, 42, 76, 50, junction);
  J.phases = ['NS', 'EW'];
  const CW1 = traffic.zone(44, 63, 52, 66, sameKind);
  const CW3 = traffic.zone(68, 33, 76, 36, sameKind);
  const CW4 = traffic.zone(68, 80, 76, 83, sameKind);
  const CW5 = traffic.zone(86, 42, 89, 50, sameKind);
  // Stretches a semi needs to itself: where yard trucks turn out onto the avenue, and where the bay truck crosses
  // the factory road. The truck waits until nothing is in them (so it never strands a trailer across a lane),
  // then cars wait for it; cars never queue behind a truck that is still waiting.
  const semiOnly = (a: string, b: string) => a === b && a !== 'semi';
  const truckZone = (x0: number, y0: number, x1: number, y1: number) => {
    const z = traffic.zone(x0, y0, x1, y1, semiOnly);
    z.keyOf = (v) => (v.kind === 'semi' ? 'semi' : 'car');
    z.yieldKey = 'semi';
    z.yieldToQueue = false;
    return z;
  };
  truckZone(68, 4, 72.2, 31);
  // reaching back over the plaza corner, so the bay truck waits in the bay rather than with its cab at the kerb
  truckZone(40, 52, 52, 72);
  // where the bay truck, coming up the factory road, turns across the southbound lane into the loading bay: in
  // view since the world grew past the classic frame (frame.ts `WORLD`), so cars wait for it rather than drive
  // through its trailer
  truckZone(43.4, 108, 48.6, 136);
  // where cars leaving the charging lot join the factory road: they wait for a moment with nobody in it
  const merge = traffic.zone(44, 52, 52, 63, (a, b) => a === b && a !== 'merge');
  merge.keyOf = (v) => (v.role === 'lot' ? 'merge' : 'car');
  merge.yieldKey = 'merge';
  merge.yieldToQueue = false;
  // pavement the semis cross: the yard exit and the yard gate (as wide as their trailers sweep), and the charging
  // lot's way out and way in
  const YE = traffic.zone(64, 6, 68.4, 28.2, sameKind);
  const YG = traffic.zone(64, -17.4, 68.4, -5, sameKind);
  const LD = traffic.zone(51.9, 58.7, 55.0, 63.4, sameKind);
  const LE = traffic.zone(58.2, 50.1, 62.6, 52.6, sameKind);
  // where the north belt's path crosses the car carriers' two service roads (activities/carrierYard.ts)
  const NB = traffic.zone(30.6, -48.6, 37.4, -45.4, sameKind);
  const NB2 = traffic.zone(56.2, -48.6, 65.6, -45.4, sameKind);
  // the carrier depot (activities/carrierDepot.ts): the stretch of the southbound lane a carrier drives on past the
  // charging lane and backs up, the stretch of the northbound lane its trailer swings across backing in (which it
  // also crosses turning out), and the stretch north of that it turns out onto (cars leave them to it; any other semi
  // passes as a car), and the stretch of the east pavement its trailer sweeps, which walkers cross as one
  const depotKey = (_v: Vehicle, leg: { tag?: string }) => (leg.tag === 'depot' ? 'semi' : 'car');
  truckZone(66, LANE_Y - 3, 72, LANE_Y + PAST + 1.5).keyOf = depotKey;
  const lane = truckZone(72, LANE_Y - 3.5, 76.2, LANE_Y + 7.5);
  lane.keyOf = depotKey;
  truckZone(72, LANE_Y - 24, 76.2, LANE_Y - 3.5).keyOf = depotKey;
  const DC = traffic.zone(75.6, -66, 79.4, -35.4, sameKind);
  return { CW1, CW3, CW4, CW5, YE, YG, LD, LE, NB, NB2, DC, depot: { lane, pavement: DC } };
}
export type RoadZones = ReturnType<typeof roadZones>;
/** A through route: its points, fillet radii and how often it is picked relative to the others. */
export interface Route {
  pts: number[][];
  r: number[];
  w: number;
}

/**
 * Through traffic: keeps `target` cars of its own on the road, each on a route picked by weight, drawing from `rng`.
 * Returns the step function.
 */
export function spawner(env: Env, rng: Rng, routes: Route[], target: number) {
  const { pal, traffic } = env;
  const paths = routes.map((rt) => Path.poly(rt.pts, rt.r));
  const totalW = routes.reduce((a, r) => a + r.w, 0);
  // semis only come for the yard and the loading bay, not as through traffic
  const kinds: [VehicleKind, number, number][] = [['suv', 0.74, 7.2], ['pod', 0.13, 6.4], ['pickup', 0.08, 7], ['van', 0.05, 6]];
  let spawnT = 0;
  const mine: Vehicle[] = [];
  const spawnCar = () => {
    let u = rng() * totalW, i = 0;
    while (u > routes[i].w && i < routes.length - 1) u -= routes[i++].w;
    const rt = routes[i];
    let v = rng(), k = 0;
    while (v > kinds[k][1] && k < kinds.length - 1) v -= kinds[k++][1];
    const [kind, , vmax] = kinds[k];
    const [sx0, sy0] = rt.pts[0];
    if (!traffic.clear(sx0, sy0, 9)) return;
    // robotaxis come in gold; `traffic.add` keeps the others to their kind's colours (traffic/paints.ts)
    const paint = kind === 'pod' || kind === 'van' ? pal.gold : pick(rng, pal.paints);
    mine.push(traffic.add(kind, paint, [{ path: paths[i], vmax: vmax * rr(rng, 0.9, 1.05) }]));
  };
  return (dt: number) => {
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = rr(rng, 1.0, 2.6) / Math.max(0.2, target / 20);
      for (let i = mine.length - 1; i >= 0; i--) if (mine[i].dead) mine.splice(i, 1);
      if (mine.length < target) spawnCar();
    }
  };
}

/** Through traffic on the avenue and the street. */
export function carSpawner(env: Env, density: number) {
  const routes: Route[] = [
    { pts: [[70, -120], [70, 175]], r: [], w: 3 },
    { pts: [[74, 175], [74, -120]], r: [], w: 3 },
    { pts: [[50, 200], [50, 48], [230, 48]], r: [6], w: 1.3 },
    { pts: [[230, 44], [46, 44], [46, 200]], r: [10], w: 1.3 },
    { pts: [[70, -120], [70, 48], [230, 48]], r: [6], w: 0.5 },
    { pts: [[70, -120], [70, 44], [46, 44], [46, 200]], r: [2, 10], w: 0.8 },
    { pts: [[74, 175], [74, 48], [230, 48]], r: [2], w: 1 },
    { pts: [[74, 175], [74, 44], [46, 44], [46, 200]], r: [6, 10], w: 0.5 },
    { pts: [[50, 200], [50, 48], [74, 48], [74, -120]], r: [6, 6], w: 0.5 },
    { pts: [[50, 200], [50, 48], [70, 48], [70, 175]], r: [6, 2], w: 0.8 },
    { pts: [[230, 44], [74, 44], [74, -120]], r: [2], w: 1 },
    { pts: [[230, 44], [70, 44], [70, 175]], r: [6], w: 0.5 },
  ];
  // the routes run well past every view (frame.ts `WORLD`), so it takes this many for the town to look as busy
  return spawner(env, env.rng, routes, Math.round(20 * density));
}
