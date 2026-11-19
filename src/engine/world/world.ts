// The city: ground plan, buildings, props, traffic routes, walkways and the activities that bring it to life.
//
// Layout (world units ≈ metres). Roads: an avenue along y at x 68–76, a street along x at y 42–50 that bends into
// the factory road along y at x 44–52. Factory top-left; the dock wing with its tall atrium window, a wide AI-compute
// platform in front of it reaching out into the yard, and a pocket park on its corner by the plaza; an open truck
// yard (gate off the avenue, exit onto the street) top-centre, battery yard top-right; a home with carport and the
// loading bay left; charging lot and construction bottom-centre; pavilion, robotaxi stop and park bottom-right.
// The outskirts (outskirts.ts) fill the sides of wide views.

import { makeRng } from '../core';
import type { Ctx, R } from '../draw';
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
import { TruckBay } from '../activities/truckBay';
import { TruckYard } from '../activities/truckYard';
import type { Activity, Env } from '../activities/activity';
import { buildOutskirts } from './outskirts';
import { roadZones, carSpawner } from './roads';
import { factory, buildings, constructionSite } from './buildings';
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
}

const EDGE = 'rgba(255,255,255,0.55)';

export function buildWorld(pal: Palette, sprites: Sprites, opts: WorldOptions): World {
  const rng = makeRng(opts.seed);
  const density = Math.max(0.2, Math.min(2, opts.density));
  const traffic = new Traffic(pal);
  const graph = new WalkGraph();
  const crowd = new Crowd(graph, pal, rng);
  const S: Static[] = [];
  const env: Env = { pal, rng, traffic, crowd, statics: S };
  const acts: Activity[] = [];
  const edge = pal.night ? 'rgba(255,255,255,0.08)' : EDGE;

  // the order matters: everything below draws from one seeded random stream
  const zones = roadZones(traffic);
  // two docks are worked by live trucks; the third slot is the charging bay they back into after loading
  const yard = new TruckYard(env, [4.5, 10.5], 16.5);
  factory(env, edge, yard);
  // AI compute: a wide platform of server racks along the dock wing, four rows of six, reaching out into the yard as far as the
  // semis' turning room allows (they swing their trailers through x 54–62 when backing into the docks)
  rackPlatform(S, pal, edge, { x0: 30.6, y0: 26.6, x1: 54.0, y1: 37.0 }, 4, 6);
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
  // the factory wing, car park, compute, Megapacks, charging hub and staff park out on the sides
  const outskirts = buildOutskirts(env, sprites, edge);
  acts.push(...outskirts.acts);
  staffBreak(env);
  // dock and yard robots
  acts.push(new Looper(env, 'robot', () => [{ x: 30.9, y: 13.6, wait: 0.8, then: (w) => (w.carry = true) }, { x: 32.4, y: 13.4, wait: 0.8, then: (w) => (w.carry = false) }], 30.9, 13.6));
  acts.push(new Looper(env, 'robot', () => [{ x: 30.9, y: 7.5, wait: 0.9, then: (w) => (w.carry = true) }, { x: 35.6, y: 7.5, wait: 0.8, then: (w) => (w.carry = false) }], 30.9, 7.5));
  acts.push(new Looper(env, 'robot', () => [{ x: 51, y: -4.6, wait: 3 }, { x: 51, y: -10.5, wait: 4 }, { x: 51, y: -16.2, wait: 3 }], 51, -8));

  walkways(graph, zones, outskirts);
  crowd.targetPeople = Math.round(18 * density);
  crowd.targetRobots = Math.round(16 * density);
  for (let i = 0; i < crowd.targetPeople; i++) crowd.wanderer('person');
  for (let i = 0; i < crowd.targetRobots; i++) crowd.wanderer('robot');
  const spawnCars = carSpawner(env, density);
  const ground = groundPainter(pal, lot, outskirts);

  const update = (dt: number) => {
    spawnCars(dt);
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
