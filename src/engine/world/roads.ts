// The road network's rules and its through traffic: the zones vehicles reserve, and the cars that come and go on
// the avenue and the street (semis only come for the yard and the loading bay).

import { pick, rr } from '../core';
import { Path } from '../path';
import type { VehicleKind } from '../traffic/meshes';
import type { Traffic } from '../traffic/traffic';
import { junction, sameKind } from '../traffic/zone';
import type { Env } from '../activities/activity';

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
  return { CW1, CW3, CW4, CW5, YE, YG, LD, LE };
}
export type RoadZones = ReturnType<typeof roadZones>;
/** Through traffic on the avenue and the street: tops the cars up to a target, each on a route picked by weight. */
export function carSpawner(env: Env, density: number) {
  const { pal, rng, traffic } = env;
  const routes: { pts: number[][]; r: number[]; w: number }[] = [
    { pts: [[70, -52], [70, 112]], r: [], w: 3 },
    { pts: [[74, 112], [74, -52]], r: [], w: 3 },
    { pts: [[50, 135], [50, 48], [135, 48]], r: [6], w: 1.3 },
    { pts: [[135, 44], [46, 44], [46, 135]], r: [10], w: 1.3 },
    { pts: [[70, -52], [70, 48], [135, 48]], r: [6], w: 0.5 },
    { pts: [[70, -52], [70, 44], [46, 44], [46, 135]], r: [2, 10], w: 0.8 },
    { pts: [[74, 112], [74, 48], [135, 48]], r: [2], w: 1 },
    { pts: [[74, 112], [74, 44], [46, 44], [46, 135]], r: [6, 10], w: 0.5 },
    { pts: [[50, 135], [50, 48], [74, 48], [74, -52]], r: [6, 6], w: 0.5 },
    { pts: [[50, 135], [50, 48], [70, 48], [70, 112]], r: [6, 2], w: 0.8 },
    { pts: [[135, 44], [74, 44], [74, -52]], r: [2], w: 1 },
    { pts: [[135, 44], [70, 44], [70, 112]], r: [6], w: 0.5 },
  ];
  const paths = routes.map((rt) => Path.poly(rt.pts, rt.r));
  const totalW = routes.reduce((a, r) => a + r.w, 0);
  // semis only come for the yard and the loading bay, not as through traffic
  const kinds: [VehicleKind, number, number][] = [['car', 0.46, 7.4], ['suv', 0.28, 7], ['pod', 0.13, 6.4], ['pickup', 0.08, 7], ['van', 0.05, 6]];
  let spawnT = 0;
  const targetCars = Math.round(11 * density);
  const spawnCar = () => {
    let u = rng() * totalW, i = 0;
    while (u > routes[i].w && i < routes.length - 1) u -= routes[i++].w;
    const rt = routes[i];
    let v = rng(), k = 0;
    while (v > kinds[k][1] && k < kinds.length - 1) v -= kinds[k++][1];
    const [kind, , vmax] = kinds[k];
    const [sx0, sy0] = rt.pts[0];
    if (!traffic.clear(sx0, sy0, 9)) return;
    const paint = kind === 'pod' || kind === 'van' ? pal.gold : pick(rng, pal.paints);
    traffic.add(kind, paint, [{ path: paths[i], vmax: vmax * rr(rng, 0.9, 1.05) }]);
  };
  return (dt: number) => {
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = rr(rng, 1.0, 2.6) / density;
      let n = 0;
      for (const v of traffic.vehicles) if (v.legs.length === 1) n++;
      if (n < targetCars) spawnCar();
    }
  };
}
