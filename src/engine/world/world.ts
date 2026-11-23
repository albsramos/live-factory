// The city: ground plan, buildings, props, traffic routes, walkways and the activities that bring it to life.
//
// Layout (world units ≈ metres). Roads: an avenue along y at x 68–76, a street along x at y 42–50 that bends into
// the factory road along y at x 44–52. Factory top-left; the dock wing grown out in glass over a wide AI-compute
// platform in front of it reaching out into the yard, and a pocket park on its corner by the plaza; an open truck
// yard (gate off the avenue, exit onto the street) top-centre, battery yard top-right; a home with carport and the
// loading bay left; charging lot and construction bottom-centre; pavilion, robotaxi stop and park bottom-right.
// The outskirts (outskirts.ts) fill the sides of wide views; past the staff park, an east road parallel to the
// avenue (x 142–150) crosses the street, with an office and a charging hub beyond it (eastSide.ts).

import { makeRng } from '../core';
import { CLAY_EDGE, type Ctx, type R } from '../draw';
import { rackPlatform } from '../blocks';
import type { Palette } from '../palette';
import type { Item } from '../sort';
import type { Sprites } from '../sprites';
import { caster, type Caster } from '../shade';
import { BoxItem, type Static } from '../statics';
import { Traffic } from '../traffic/traffic';
import { Crowd, WalkGraph } from '../people/crowd';
import { ChargingLot } from '../activities/chargingLot';
import { DogWalk } from '../activities/dogWalk';
import { Looper } from '../activities/looper';
import { TaxiStop } from '../activities/taxiStop';
import { Roadsters } from '../activities/roadster';
import { TruckBay } from '../activities/truckBay';
import { TruckYard } from '../activities/truckYard';
import { CarrierYard } from '../activities/carrierYard';
import { CarrierDepot, DEPOT_NOSE } from '../activities/carrierDepot';
import { charger } from './chargers';
import type { Activity, Env } from '../activities/activity';
import { buildEastSide } from './eastSide';
import { buildStaffPark } from './staffPark';
import { buildLake } from './lake';
import { buildStuntPad } from './stuntPad';
import { buildParkLamps } from './parkLamps';
import { buildSouthLawn } from './southLawn';
import { buildNorthBelt } from './northBelt';
import { buildFarWest } from './farWest';
import { buildOutskirts } from './outskirts';
import { roadZones, carSpawner } from './roads';
import { factory, buildings, constructionSite } from './buildings';
import { roofWalks } from './plaza';
import { glassHall } from './glassHall';
import { DockInterior } from './dockInterior';
import type { Branding } from './lettering';
import { pocketParkBenches, streetFurniture, chat, staffBreak } from './streetLife';
import { walkways } from './walkways';
import { groundPainter } from './groundPlan';

export interface World {
  statics: Static[];
  /** tall buildings whose shadows fall on the objects around them */
  casters: Caster[];
  traffic: Traffic;
  crowd: Crowd;
  acts: Activity[];
  ground(ctx: Ctx, r: R): void;
  update(dt: number): void;
  items(out: Item[]): void;
  shadows(ctx: Ctx): void;
  /** night lighting on the road (headlights, tail lights), drawn after the shadows and before the items */
  lights(ctx: Ctx): void;
}

export interface WorldOptions {
  seed: number;
  /** 0.3 … 1.5: how busy the streets are */
  density: number;
  /** whether the factory's front carries the opt-in lettering; the scene flips it in place, without a rebuild */
  branding: Branding;
}

export function buildWorld(pal: Palette, sprites: Sprites, opts: WorldOptions): World {
  const rng = makeRng(opts.seed);
  const density = Math.max(0.2, Math.min(2, opts.density));
  const traffic = new Traffic(pal);
  const graph = new WalkGraph();
  const crowd = new Crowd(graph, pal, rng);
  const S: Static[] = [];
  const env: Env = { pal, rng, traffic, crowd, statics: S };
  const acts: Activity[] = [];
  // the clay highlight follows the theme when drawn, so a theme change needs no rebuild
  const edge = CLAY_EDGE;

  // the order matters: everything below draws from one seeded random stream
  const zones = roadZones(traffic);
  // two docks are worked by live trucks; the third slot is the charging bay they back into after loading
  const yard = new TruckYard(env, [4.5, 10.5], 16.5);
  // inside the dock wing, open to its glass extension and through the open garage by the docks: Optimus at work
  const inside = new DockInterior(pal, opts.seed * 4513 + 7);
  acts.push(inside);
  factory(env, edge, yard, opts.branding, inside);
  // AI compute: a wide platform of server racks along the dock wing, four rows of six, reaching out into the yard as far as the
  // semis' turning room allows (they swing their trailers through x 54–62 when backing into the docks)
  rackPlatform(S, pal, edge, { x0: 30.6, y0: 26.6, x1: 54.0, y1: 35.94 }, 4, 6);
  // the dock wing grows out over it in glass, its full height (10 m) and flush with its +y face (y 36), so the racks
  // stay dry and show through
  S.push(...glassHall(pal, { x0: 30, y0: 26.4, x1: 54.0, y1: 35.94, h: 10, isAttached: true, rails: [3.6, 7] }));
  pocketParkBenches(env, edge);
  buildings(env, edge);
  constructionSite(env, edge, acts);
  streetFurniture(env, sprites, edge);
  // people chatting; robots join in on the streets, but the parks are for staff on their break
  chat(env, [[30.2, 56.0], [31.2, 57.2], [29.7, 57.6]]);
  chat(env, [[90.2, 40.2], [91.2, 41.0]]);
  chat(env, [[54.0, 56.4], [54.2, 57.6]]);

  // the scripted scenes
  yard.seedCharging(58);
  acts.push(yard);
  acts.push(new TruckBay(env));
  const lot = new ChargingLot(env);
  lot.seed(0);
  lot.seed(2);
  acts.push(lot);
  acts.push(new TaxiStop(env, (w) => crowd.adopt(w)));
  acts.push(new DogWalk(env));
  // the roadster that now and then hops over the avenue's traffic, on a random stream of its own
  acts.push(new Roadsters(env, makeRng(opts.seed * 7919 + 17)));
  // two Optimus robots on the factory's roof terrace, also on a stream of their own
  acts.push(...roofWalks({ ...env, rng: makeRng(opts.seed * 6271 + 29) }));
  // the factory wing, car park, compute, Megapacks, charging hub and staff park out on the sides
  const outskirts = buildOutskirts(env, sprites, edge);
  acts.push(...outskirts.acts);
  // the east road and what lies past it, on a random stream of its own
  const east = buildEastSide({ ...env, rng: makeRng(opts.seed * 9157 + 41) }, sprites, edge, density);
  acts.push(...east.acts);
  // a pond, a pergola and more staff in the staff park, also on a stream of its own
  const park = buildStaffPark({ ...env, rng: makeRng(opts.seed * 7451 + 53) }, sprites, edge);
  acts.push(...park.acts);
  // and a lake at its north end, with rocks, on a stream of its own
  const lake = buildLake({ ...env, rng: makeRng(opts.seed * 3967 + 89) });
  // a café, its tables and its garden in the park south of the street, on a stream of its own
  const south = buildSouthLawn({ ...env, rng: makeRng(opts.seed * 6143 + 67) }, sprites, edge);
  // a belt of trees and a path north of the yard, the Megapacks and the staff park, on a stream of its own
  const belt = buildNorthBelt({ ...env, rng: makeRng(opts.seed * 5303 + 71) }, sprites, edge);
  // a second staff car park and lawns with trees out west, on a stream of its own
  const west = buildFarWest({ ...env, rng: makeRng(opts.seed * 4789 + 83) }, sprites, edge);
  acts.push(...west.acts);
  // an Easter egg in the north belt: roadsters doing tricks for a ring of Optimus, on a stream of its own
  const pad = buildStuntPad({ ...env, rng: makeRng(opts.seed * 3449 + 97) });
  acts.push(pad.act);
  // car carriers loading new cars for delivery in the north yard, on a stream of its own
  const carriers = new CarrierYard({ ...env, rng: makeRng(opts.seed * 2861 + 101) });
  carriers.seed(0, 2);
  carriers.seed(1, 4);
  carriers.park([37.2, 41.6, 28.4, 24.2, 20.0, 15.8, 11.6]);
  acts.push(carriers);
  // the carrier depot east of the avenue: carriers charging nose-in, now and then one leaving and one coming in, on a
  // stream of its own; a charger beside each cab, its cable to a port on the cab's side, and both out of the way of
  // the trailers that cut the corner across the spots north of their own (measured: they come no further east than
  // x 82.8 there)
  const depot = new CarrierDepot(env, makeRng(opts.seed * 3191 + 107));
  for (const [k, dwell] of [[1, 25], [2, 120], [3, 200]]) depot.seed(k, dwell);
  for (const s of depot.spots) S.push(charger(pal, DEPOT_NOSE + 3.95, s.y + 2.65, [DEPOT_NOSE + 2.75, s.y + 1.6, 1.1], s, true));
  acts.push(depot);
  // lamps along the park paths, lit at night
  const lamps = buildParkLamps(env);
  staffBreak(env);
  // dock and yard robots
  // two take boxes from inside the factory, through the open garage between the second dock and the bay
  // (GARAGE in dockInterior.ts), and stack them on the pallets by it: clear of the trailers either side
  for (const [y, wait] of [[13.0, 0.8], [14.1, 1.3]] as const) {
    const pick = { x: 30.45, y, wait, face: [-1, 0] as [number, number], then: (w: { carry: boolean }) => (w.carry = true) };
    const drop = { x: 32.2, y, wait: wait * 0.9, then: (w: { carry: boolean }) => (w.carry = false) };
    acts.push(new Looper(env, 'robot', () => [pick, drop], y < 13.5 ? 30.9 : 31.8, y));
  }
  acts.push(new Looper(env, 'robot', () => [{ x: 51, y: -4.6, wait: 3 }, { x: 51, y: -10.5, wait: 4 }, { x: 51, y: -16.2, wait: 3 }], 51, -8));

  walkways(graph, zones, outskirts, east, south, belt, park);
  // walkers spend a while off screen on the long walks to and from the world's edges, so more of them
  crowd.targetPeople = Math.round(32 * density);
  crowd.targetRobots = Math.round(28 * density);
  for (let i = 0; i < crowd.targetPeople; i++) crowd.wanderer('person');
  for (let i = 0; i < crowd.targetRobots; i++) crowd.wanderer('robot');
  // however long the page stays open, the crowd never grows past half again its size
  crowd.cap = Math.round(crowd.walkers.length * 1.5);
  const spawnCars = carSpawner(env, density);
  const ground = groundPainter(pal, lot, outskirts, east, [belt.ground, (ctx) => carriers.ground(ctx), (ctx) => depot.ground(ctx), park.ground, lake.ground, west.ground], [south.ground, lamps.ground]);

  const update = (dt: number) => {
    spawnCars(dt);
    east.spawn(dt);
    traffic.update(dt);
    crowd.update(dt);
    for (const a of acts) a.update(dt);
  };

  const items = (out: Item[]) => {
    traffic.items(out);
    crowd.items(out);
    for (const a of acts) a.items?.(out);
  };

  const shadows = (ctx: Ctx) => {
    traffic.shadows(ctx);
    crowd.shadows(ctx);
    for (const a of acts) a.shadows?.(ctx);
  };

  // buildings tall and big enough for their shadow to fall across their neighbours; an upper storey counts as
  // standing on the ground (it sits on the floor below), a roof on posts doesn't count
  const tall = (s: BoxItem) => (s.z0 === 0 && s.z1 >= 3) || (s.z0 <= 3.6 && s.z1 >= 5);
  const casters = S.filter((s): s is BoxItem => s instanceof BoxItem && tall(s) && (s.x1 - s.x0) * (s.y1 - s.y0) >= 20).map(
    (b) => caster(b.x0, b.y0, b.x1, b.y1, b.z1, b),
  );

  const lights = (ctx: Ctx) => traffic.lights(ctx);

  return { statics: S, casters, traffic, crowd, acts, ground, update, items, shadows, lights };
}
