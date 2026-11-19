// The city: ground plan, buildings, props, traffic routes, walkways and the activities that bring it to life.
//
// Layout (world units ≈ metres). Roads: an avenue along y at x 68–76, a street along x at y 42–50 that bends into
// the factory road along y at x 44–52. Factory top-left; the dock wing with its tall atrium window, a wide AI-compute
// platform in front of it reaching out into the yard, and a pocket park on its corner by the plaza; an open truck
// yard (gate off the avenue, exit onto the street) top-centre, battery yard top-right; a home with carport and the
// loading bay left; charging lot and construction bottom-centre; pavilion, robotaxi stop and park bottom-right.

import { C, makeRng, pick, rr } from './core';
import { arcPts, box, boxShadow, drawMesh, groundPoly, groundRect, lineW, onFaceX, onFaceY, rectShadow, type Ctx, type R } from './draw';
import { megapacks, rackPlatform } from './blocks';
import { atrium, solarRoof, windowGlow, windowSpill, windowsX, windowsY, type Band, type LitFace } from './details';
import type { Palette } from './palette';
import { Path } from './path';
import type { Item } from './sort';
import type { Sprites } from './sprites';
import { caster, type Caster } from './shade';
import { BoxItem, FnItem, HedgeItem, LampItem, TreeItem, type Static } from './statics';
import { MESH, Traffic, junction, sameKind, type VehicleKind } from './vehicles';
import { Crowd, WalkGraph, Walker } from './walkers';
import { ChargingLot, Crane, DogWalk, Looper, TaxiStop, TruckBay, TruckYard, type Activity, type Env } from './activities';
import { buildOutskirts } from './outskirts';

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

  // ------------------------------------------------------------------------------------------------- zones
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
  // the two middle docks are worked by live trucks; the end docks hold parked trailers
  const yard = new TruckYard(env, [10.5, 16.5]);
  const parkedDocks = [4.5, 22.5];

  // ------------------------------------------------------------------------------------------------- factory
  const factoryBandsX: Band[] = [
    { top: 1.2, bot: 3.8, every: 1.5 },
    { top: 5.2, bot: 7.8, every: 1.5 },
    { top: 9.2, bot: 12.7, every: 1.5, spans: [[0.5, 11.2], [16.8, 35.5]] },
    { top: 9.6, bot: 12.95, every: 1.1, spans: [[11.6, 16.4]], dark: true },
  ];
  const factoryBandsY: Band[] = [
    { top: 1.2, bot: 3.8, every: 1.5, spans: [[0.5, 65.5]] },
    { top: 5.2, bot: 7.8, every: 1.5, spans: [[0.5, 65.5]] },
    { top: 9.2, bot: 12.7, every: 1.5, spans: [[0.5, 65.5]] },
  ];
  S.push(
    new BoxItem(-40, 36, 0, 26, 72, 13, pal.factory, { edge }, (r) => {
      windowsX(r, pal, 26, 36, 72, 13, factoryBandsX);
      windowsY(r, pal, -40, 26, 72, 13, factoryBandsY);
      solarRoof(r, pal, -40, 36, 26, 72, 13, 1.2, 2.6);
    }),
  );
  // entrance canopy and its posts
  S.push(new BoxItem(26, 53.6, 4.05, 30.6, 62.4, 4.35, pal.white, { edge }));
  S.push(new BoxItem(30.1, 53.9, 0, 30.35, 54.15, 4.05, pal.white));
  S.push(new BoxItem(30.1, 61.85, 0, 30.35, 62.1, 4.05, pal.white));

  // dock wing with roll-up doors and a tall atrium window above the compute platform
  const dockDoors = [4.5, 10.5, 16.5, 22.5];
  S.push(
    new BoxItem(-30, 0, 0, 30, 36, 10, pal.factory, { edge }, (r) => {
      onFaceX(r, 30, 0, 36, 10, (ctx) => {
        for (const y of dockDoors) {
          const u = 36 - y;
          ctx.fillStyle = pal.dockDoor;
          ctx.fillRect(u - 1.65, 6.0, 3.3, 3.98);
          ctx.strokeStyle = pal.night ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.16)';
          ctx.lineWidth = 0.05;
          ctx.beginPath();
          for (let v = 6.3; v < 9.9; v += 0.32) {
            ctx.moveTo(u - 1.6, v);
            ctx.lineTo(u + 1.6, v);
          }
          ctx.stroke();
        }
      });
      windowsX(r, pal, 30, 0, 36, 10, [{ top: 1.4, bot: 3.0, every: 1.2, spans: [[10.4, 35.6]] }]);
      atrium(r, pal, 30, 0, 36, 10, 0.6, 9.4, 1.4, 9.7);
      solarRoof(r, pal, -30, 0, 30, 36, 10, 1.0, 2.6);
    }).live((r) => {
      // a lamp beside each dock: green while a trailer is loading, amber while one is coming or going, off when free
      onFaceX(r, 30, 0, 36, 10, (ctx) => {
        for (const y of dockDoors) {
          const d = yard.docks.find((k) => k.y === y);
          const loading = d ? d.loading : true;
          const busy = d ? d.taken : true;
          const pulse = loading && d ? 0.65 + 0.35 * Math.sin(r.t * 3 + y) : 1;
          ctx.fillStyle = loading ? pal.led : busy ? pal.ledWarm : pal.night ? '#2a2c33' : '#c3c4cc';
          ctx.globalAlpha = pulse;
          ctx.fillRect(36 - y + 2.05, 5.15, 0.34, 0.24);
          ctx.globalAlpha = 1;
        }
      });
    }),
  );
  // trailers parked at the far docks
  const trailerMats = [pal.white, pal.carGlass, pal.tyre, pal.headlight, pal.taillight, pal.white];
  for (const y of parkedDocks) {
    S.push(
      new FnItem(30.2, y - 1.3, 0, 43.6, y + 1.3, 4.1, (r) => drawMesh(r, MESH.trailer, 43.0, y, 0, 1, 0, trailerMats), (ctx) =>
        rectShadow(ctx, 36.9, y, 1, 0, 6.7, 1.27, 3.6),
      ).still(),
    );
  }
  // pallets in the gaps between docks, by the wall
  for (const [x, y, n] of [[33.4, 13.5, 2], [35.0, 19.5, 1], [32.0, 19.5, 2], [32.2, 1.0, 1]] as const) {
    S.push(
      new FnItem(x - 0.6, y - 0.6, 0, x + 0.6, y + 0.6, n * 0.95, (r) => {
        for (let i = 0; i < n; i++) drawMesh(r, MESH.crate, x, y, i * 0.95, 1, 0, [pal.crate, pal.carGlass, pal.concrete.right]);
      }, (ctx) => boxShadow(ctx, x - 0.55, y - 0.55, x + 0.55, y + 0.55, n * 0.95)).still(),
    );
  }

  // ------------------------------------------------------------------------------------------------- AI compute
  // a wide platform of server racks along the dock wing, four rows of six, reaching out into the yard as far as the
  // semis' turning room allows (they swing their trailers through x 54–62 when backing into the docks)
  rackPlatform(S, pal, edge, { x0: 30.6, y0: 26.6, x1: 54.0, y1: 37.0 }, 4, 6);

  // ------------------------------------------------------------------------------------------------- pocket park
  // on the corner between the compute platform, the plaza walk and the street: grass, a path, benches, trees
  const lawn = [31.0, 38.2, 44.6, 38.2, 44.6, 44.2, 41.4, 47.8, 31.0, 47.8];
  const parkPath = [[36.2, 49.0], [37.4, 45.2], [40.6, 41.6], [45.2, 41.9]];
  for (const [x0, y0, x1, y1] of [[37.2, 39.0, 39.2, 39.5], [31.5, 42.4, 32.0, 44.4]]) S.push(new BoxItem(x0, y0, 0, x1, y1, 0.45, pal.white, { edge }));

  // ------------------------------------------------------------------------------------------------- battery yard
  // north of the docks with a clear apron in front of every one of them, and clear of the yard lane
  megapacks(S, pal, edge, [[44.4, 50.2], [51.8, 57.6]], [-6.4, -9.2, -12, -14.8, -17.6, -20.4, -23.2]);
  S.push(
    new BoxItem(62.2, 0.4, 0, 64.8, 2.8, 2.1, pal.factory, { edge }, (r) => {
      onFaceY(r, 62.2, 64.8, 2.8, 2.1, (ctx, w) => {
        ctx.strokeStyle = pal.night ? 'rgba(0,0,0,0.3)' : 'rgba(90,92,104,0.25)';
        ctx.lineWidth = 0.08;
        ctx.beginPath();
        for (let u = 0.3; u < w; u += 0.3) {
          ctx.moveTo(u, 0.2);
          ctx.lineTo(u, 1.9);
        }
        ctx.stroke();
      });
    }),
  );

  // ------------------------------------------------------------------------------------------------- pavilion
  S.push(
    new BoxItem(80, 26, 0, 97, 38, 3.6, pal.white, { edge }, (r) => {
      windowsY(r, pal, 80, 97, 38, 3.6, [{ top: 0.4, bot: 3.45, every: 1.5, spans: [[0.4, 7.8], [9.6, 16.6]] }, { top: 0.6, bot: 3.55, every: 0.9, spans: [[7.9, 9.5]], dark: true }]);
      windowsX(r, pal, 97, 26, 38, 3.6, [{ top: 0.4, bot: 3.45, every: 1.5, spans: [[0.4, 11.6]] }]);
    }),
  );
  S.push(
    new BoxItem(86, 24.5, 3.6, 97, 38, 7.4, pal.white, { edge }, (r) => {
      onFaceY(r, 86, 97, 38, 7.4, (ctx, w) => {
        const [c0, c1] = r.night ? pal.windowNight : pal.window;
        const g = ctx.createLinearGradient(0, 0.4, 0, 3.6);
        g.addColorStop(0, c0);
        g.addColorStop(1, c1);
        ctx.fillStyle = g;
        ctx.fillRect(0.4, 0.4, w - 0.8, 3.2);
        windowGlow(r, ctx, w, [{ top: 0.4, bot: 3.6, spans: [[0.4, w - 0.4]] }]);
        // vertical fins
        for (let u = 0.6; u < w - 0.4; u += 0.42) {
          ctx.fillStyle = pal.white.left;
          ctx.fillRect(u, 0.3, 0.16, 3.4);
          ctx.fillStyle = pal.white.right;
          ctx.fillRect(u + 0.16, 0.3, 0.05, 3.4);
        }
      });
    }),
  );
  S.push(new BoxItem(79.4, 25.4, 3.6, 86, 38.7, 3.95, pal.white, { edge }));
  S.push(new BoxItem(79.55, 38.3, 0, 79.8, 38.55, 3.6, pal.white));

  // ------------------------------------------------------------------------------------------------- robotaxi shelter
  S.push(new BoxItem(84.2, 60.0, 0, 84.45, 66.0, 2.5, pal.white, { edge }));
  S.push(new BoxItem(83.25, 60.6, 0, 83.95, 65.4, 0.46, pal.white, { edge }));
  S.push(new BoxItem(82.0, 59.8, 2.5, 84.7, 66.2, 2.72, pal.white, { edge }));

  // ------------------------------------------------------------------------------------------------- home: solar roof, batteries, carport charging
  // on the left, between the factory corner and the loading bay
  S.push(
    new BoxItem(20.4, 75.6, 0, 28.8, 84.2, 3.2, pal.white, { edge }, (r) => {
      windowsY(r, pal, 20.4, 28.8, 84.2, 3.2, [{ top: 0.3, bot: 3.05, every: 1.6, spans: [[0.4, 8.0]] }]);
      windowsX(r, pal, 28.8, 75.6, 84.2, 3.2, [{ top: 0.35, bot: 2.95, every: 1.5, spans: [[5.2, 8.2]] }, { top: 0.7, bot: 3.2, every: 1, spans: [[3.3, 4.3]], dark: true }]);
    }),
  );
  S.push(
    new BoxItem(20, 75.2, 3.2, 29.3, 84.6, 6.3, pal.white, { edge }, (r) => {
      windowsY(r, pal, 20, 29.3, 84.6, 6.3, [{ top: 0.65, bot: 2.25, every: 1.25, spans: [[0.6, 5.8]] }]);
      windowsX(r, pal, 29.3, 75.2, 84.6, 6.3, [{ top: 0.65, bot: 2.25, every: 1.25, spans: [[0.8, 3.8], [5.6, 8.6]] }]);
      solarRoof(r, pal, 20, 75.2, 29.3, 84.6, 6.3, 0.45);
    }),
  );
  // home batteries on the wall facing the bay
  for (const y of [81.6, 82.75]) {
    S.push(
      new BoxItem(28.8, y, 0.15, 29.18, y + 0.95, 1.95, pal.bright, { edge }).live((r) => {
        const p = 0.5 + 0.5 * Math.sin(r.t * 1.4 + y);
        const ctx = r.ctx;
        ctx.globalAlpha = 0.4 + 0.6 * p;
        ctx.fillStyle = pal.led;
        const X = (29.18 - (y + 0.48)) * C, Y = (29.18 + y + 0.48) * 0.5 - 1.55;
        ctx.fillRect(X - 0.04, Y - 0.12, 0.08, 0.24);
        ctx.globalAlpha = 1;
      }),
    );
  }
  // carport with a solar roof, the car on its charger
  S.push(new BoxItem(21, 85.4, 2.6, 28.6, 89.6, 2.85, pal.white, { edge }, (r) => solarRoof(r, pal, 21, 85.4, 28.6, 89.6, 2.85, 0.35)));
  for (const [x, y] of [[21.15, 85.55], [28.2, 85.55], [21.15, 89.2], [28.2, 89.2]]) S.push(new BoxItem(x, y, 0, x + 0.25, y + 0.25, 2.6, pal.white));
  S.push(
    new FnItem(21.35, 88.25, 0, 21.75, 88.65, 1.3, (r) => {
      box(r, 21.38, 88.28, 0, 21.72, 88.62, 1.25, pal.bright, { edge });
      const p = 0.5 + 0.5 * Math.sin(r.t * 2.2);
      const ctx = r.ctx;
      ctx.globalAlpha = 0.45 + 0.55 * p;
      ctx.fillStyle = pal.led;
      const X = (21.72 - 88.45) * C, Y = (21.72 + 88.45) * 0.5 - 0.95;
      ctx.fillRect(X - 0.04, Y - 0.1, 0.08, 0.2);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = pal.night ? '#0c0c0e' : '#3b3d44';
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      const ex = (22.5 - 88.2) * C, ey = (22.5 + 88.2) * 0.5 - 0.7;
      ctx.moveTo(X, Y + 0.15);
      ctx.quadraticCurveTo((X + ex) / 2, Y + 0.6, ex, ey);
      ctx.stroke();
    }),
  );
  {
    const mats = [pal.paints[4], pal.carGlass, pal.tyre, pal.headlight, pal.taillight];
    S.push(new FnItem(22.2, 86.5, 0, 27.0, 88.5, 1.65, (r) => drawMesh(r, MESH.suv, 24.6, 87.5, 0, -1, 0, mats), (ctx) => rectShadow(ctx, 24.6, 87.5, -1, 0, 2.3, 0.95, 1.2)).still());
  }

  // ------------------------------------------------------------------------------------------------- construction site
  const cols = [56, 59.75, 63.5];
  const rows = [87, 91.33, 95.67, 100];
  for (const x of cols) for (const y of rows) {
    S.push(new BoxItem(x - 0.16, y - 0.16, 0, x + 0.16, y + 0.16, 3.4, pal.steel));
    S.push(new BoxItem(x - 0.16, y - 0.16, 3.6, x + 0.16, y + 0.16, 6.85, pal.steel));
  }
  S.push(new BoxItem(55.7, 86.7, 3.4, 63.8, 96.0, 3.6, pal.concrete, { edge }));
  for (const y of rows) S.push(new BoxItem(55.84, y - 0.13, 7.05, 63.66, y + 0.13, 7.25, pal.steel, undefined, undefined, false));
  for (const x of cols) S.push(new BoxItem(x - 0.13, 86.84, 6.85, x + 0.13, 100.16, 7.05, pal.steel, undefined, undefined, false));
  S.push(new BoxItem(55.84, 99.87, 3.4, 63.66, 100.13, 3.6, pal.steel));
  // stair tower
  S.push(new BoxItem(64.3, 88.0, 0, 65.4, 90.6, 3.6, pal.white, { edge }, (r) => {
    onFaceX(r, 65.4, 88.0, 90.6, 3.6, (ctx, w) => {
      ctx.strokeStyle = pal.night ? 'rgba(0,0,0,0.4)' : 'rgba(100,102,114,0.45)';
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      for (let v = 0.4; v < 3.6; v += 0.9) {
        ctx.moveTo(0.1, v + 0.9);
        ctx.lineTo(w - 0.1, v);
      }
      ctx.stroke();
    });
  }));
  // the pickup parked by the site
  {
    const mats = [pal.steel, pal.carGlass, pal.tyre, pal.headlight, pal.taillight];
    S.push(new FnItem(57.6, 81.9, 0, 63.4, 84.1, 2, (r) => drawMesh(r, MESH.pickup, 60.5, 83.0, 0, -1, 0, mats), (ctx) => rectShadow(ctx, 60.5, 83, -1, 0, 2.8, 1.0, 1.4)).still());
  }
  const crane = new Crane(env);
  acts.push(crane);
  // workers: robots and people in hi-vis on the slab and by the pile
  acts.push(new Looper(env, 'robot', () => [{ x: 57.6, y: 88.6, z: 3.6, wait: 2 }, { x: 61.8, y: 94.2, z: 3.6, wait: 2.5 }], 57.6, 88.6, 3.6));
  acts.push(new Looper(env, 'person', () => [{ x: 61.6, y: 88.4, z: 3.6, wait: 3 }, { x: 58.2, y: 92.8, z: 3.6, wait: 2 }], 61.6, 88.4, 3.6, true));
  acts.push(new Looper(env, 'robot', () => [{ x: 58.8, y: 92.4, z: 3.6, wait: 4 }, { x: 59.6, y: 91.6, z: 3.6, wait: 4 }], 58.8, 92.4, 3.6));
  acts.push(new Looper(env, 'person', () => [{ x: 57.4, y: 87.9, wait: 4 }, { x: 58.9, y: 88.3, wait: 3 }], 57.4, 87.9, 0, true));

  // ------------------------------------------------------------------------------------------------- greenery and street furniture
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
  for (const [x, y, ax, ay] of lamps) S.push(new LampItem(x, y, ax, ay, pal.steel, pal.factoryDark.right));
  for (const [x0, y0, x1, y1] of [[31.0, 62.6, 32.8, 63.1], [81.9, 69.2, 82.4, 71.0], [86.6, 60.9, 88.4, 61.4], [92.2, 57.4, 92.7, 59.2], [95.4, 57.0, 97.2, 57.5]]) {
    S.push(new BoxItem(x0, y0, 0, x1, y1, 0.45, pal.white, { edge }));
  }
  // people chatting; robots join in on the streets, but the parks are for staff on their break
  const chat = (pts: number[][], robots = 0.5) => {
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    for (const [x, y] of pts) {
      const w = new Walker(rng() < robots ? 'robot' : 'person', pal, rng, x, y);
      w.face(cx - x, cy - y);
      w.stance = 'chat';
      crowd.add(w);
    }
  };
  chat([[30.2, 56.0], [31.2, 57.2], [29.7, 57.6]]);
  chat([[90.2, 40.2], [91.2, 41.0]]);
  chat([[54.0, 56.4], [54.2, 57.6]]);

  // ------------------------------------------------------------------------------------------------- activities
  yard.seed(1, 9);
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
  // the parks are where staff take their break: on the benches, or standing together with a coffee
  const sit = (x: number, y: number, fx: number, fy: number) => {
    const w = new Walker('person', pal, rng, x, y);
    w.stance = 'sit';
    w.face(fx, fy);
    crowd.add(w);
  };
  // pocket park by the compute platform
  sit(37.7, 39.85, 0, 1);
  sit(38.7, 39.85, 0, 1);
  sit(32.35, 43.6, 1, 0);
  chat([[33.9, 41.5], [34.9, 42.4]], 0);
  // the park by the robotaxi stop
  sit(87.0, 61.75, 0, 1);
  sit(87.95, 61.75, 0, 1);
  sit(95.9, 57.85, 0, 1);
  sit(93.05, 58.3, 1, 0);
  chat([[93.4, 55.2], [94.5, 55.6], [93.8, 56.2]], 0);
  // dock and yard robots
  acts.push(new Looper(env, 'robot', () => [{ x: 30.9, y: 13.6, wait: 0.8, then: (w) => (w.carry = true) }, { x: 32.4, y: 13.4, wait: 0.8, then: (w) => (w.carry = false) }], 30.9, 13.6));
  acts.push(new Looper(env, 'robot', () => [{ x: 30.9, y: 19.4, wait: 0.9, then: (w) => (w.carry = true) }, { x: 36.4, y: 19.5, wait: 0.8, then: (w) => (w.carry = false) }], 30.9, 19.4));
  acts.push(new Looper(env, 'robot', () => [{ x: 51, y: -4.6, wait: 3 }, { x: 51, y: -10.5, wait: 4 }, { x: 51, y: -16.2, wait: 3 }], 51, -8));

  // ------------------------------------------------------------------------------------------------- walkways
  const g = graph;
  const aw = [g.node(66.5, -50, true), g.node(66.5, 4), g.node(66.5, 34.5), g.node(66.5, 40.5), g.node(66.5, 51.5), g.node(66.5, 66), g.node(66.5, 81.5), g.node(66.5, 96), g.node(66.5, 112, true)];
  const awExit = g.node(66.5, 29.8);
  // either side of the yard gate
  const gate = [g.node(66.5, -18.6), g.node(66.5, -3.4)];
  g.link(aw[0], gate[0]);
  g.link(gate[0], gate[1], YG);
  g.link(gate[1], aw[1]);
  g.link(aw[1], awExit, YE);
  g.chain([awExit, aw[2], aw[3]]);
  g.chain(aw.slice(4));
  // east side of the avenue; round the robotaxi bay, clear of the taper the cars pull in through and of the van's
  // nose swinging out as it turns in
  const ae = [g.node(77.5, -50, true), g.node(77.5, 34.5), g.node(77.5, 40.5), g.node(77.5, 51.5), g.node(80.6, 55.5), g.node(81.0, 68, false, 0.4), g.node(80.6, 75.2, false, 0.4), g.node(77.8, 78.2), g.node(77.5, 81.5), g.node(77.5, 100, true)];
  // either side of the charging hub's driveway
  const hubSides = [g.node(77.8, 6.8, false, 0.5), g.node(77.8, 17.4, false, 0.5)];
  g.chain([ae[0], hubSides[0]]);
  g.link(hubSides[0], hubSides[1], outskirts.hubCrossing);
  g.chain([hubSides[1], ae[1], ae[2]]);
  g.chain(ae.slice(3));
  g.link(aw[2], ae[1], CW3);
  g.link(aw[6], ae[8], CW4);
  const sn = [g.node(42.5, 54), g.node(44.31, 47.25), g.node(49.25, 42.31), g.node(52.5, 41.1), g.node(56, 40.5), g.node(61, 40.5)];
  g.chain(sn);
  g.link(sn[5], aw[3]);
  const sne = [g.node(86.5, 40.5), g.node(104, 40.5), g.node(130, 40.5, true)];
  g.link(ae[2], sne[0]);
  g.chain(sne);
  // round the inside corner of the bend a step back from the kerb, clear of where the bay truck's trailer cuts
  // across it, then single file over the charging lot's entrance, between the trailer's sweep and a car waiting
  // inside the entrance
  const ss0 = g.node(55.2, 54.3);
  const le = [g.node(57.9, 52.3, false, 0.25), g.node(63.4, 52.2, false, 0.25)];
  g.link(ss0, le[0]);
  g.link(le[0], le[1], LE);
  g.link(le[1], aw[4]);
  const sse = [g.node(86.5, 51.5), g.node(90.5, 51.5), g.node(104, 51.5), g.node(125, 51.5, true)];
  g.link(ae[3], sse[0]);
  g.chain(sse);
  g.link(sne[0], sse[0], CW5);
  const fw1 = g.node(42.5, 64.5);
  g.link(sn[0], fw1);
  // down the factory road past the charging lot's way out
  const fd = g.node(53.5, 57.6, false, 0.5);
  const fe = [ss0, g.node(53.5, 64.5, false, 0.5), g.node(53.5, 83.5), g.node(53.5, 126, true)];
  g.link(ss0, fd);
  g.link(fd, fe[1], LD);
  g.chain(fe.slice(1));
  g.link(fw1, fe[1], CW1);
  const door = g.node(26.8, 58.0, true);
  const p = [g.node(29.2, 58.6), g.node(36, 61.2), g.node(41.2, 61.6), g.node(29.0, 50.0), g.node(41, 50.2)];

  g.chain([door, p[0], p[1]]);
  g.link(p[1], p[2]);
  g.link(p[2], fw1);
  g.link(p[0], p[3]);
  // the path through the pocket park, from the plaza walk to the street corner
  const pp = parkPath.map(([x, y], i) => (i === 0 ? g.node(36.2, 50.1) : g.node(x, y)));
  g.chain([p[3], pp[0], p[4]]);
  g.chain(pp);
  g.link(pp[3], sn[2]);
  g.link(p[4], sn[1]);
  // the front door of the house on the corner
  // round the plaza hedge to the front door of the house beside the bay
  const houseWalk = [p[0], g.node(28.1, 66.2), g.node(29.9, 73.6), g.node(29.9, 80.4, true)];
  g.chain(houseWalk);
  // the car park's and the staff park's walks
  outskirts.walks(g, houseWalk[2], sne[1]);
  const pd = g.node(88.6, 38.8, true);
  g.link(pd, sne[0]);
  // round the west side of the house and along its garden
  const pk = [g.node(85.2, 54.0), g.node(85.2, 65.0), g.node(112, 65.6, true)];
  g.link(sse[0], pk[0]);
  g.link(pk[0], pk[1]);
  g.link(pk[1], pk[2]);
  g.link(pk[1], ae[5]);

  crowd.targetPeople = Math.round(18 * density);
  crowd.targetRobots = Math.round(16 * density);
  for (let i = 0; i < crowd.targetPeople; i++) crowd.wanderer('person');
  for (let i = 0; i < crowd.targetRobots; i++) crowd.wanderer('robot');

  // ------------------------------------------------------------------------------------------------- traffic
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

  // ------------------------------------------------------------------------------------------------- ground
  const roads = (ctx: Ctx) => {
    groundRect(ctx, 68, -100, 76, 260);
    groundRect(ctx, 56, 42, 260, 50);
    groundRect(ctx, 44, 54, 52, 260);
    groundPoly(ctx, [...arcPts(56, 54, 12, Math.PI, Math.PI / 2, 18), ...arcPts(56, 54, 4, Math.PI * 1.5, -Math.PI / 2, 10)]);
    // rounded corners where the street meets the avenue
    for (const [cx, cy, ox, oy] of [[68, 42, -3, -3], [76, 42, 3, -3], [68, 50, -3, 3], [76, 50, 3, 3]]) {
      const ccx = cx + ox, ccy = cy + oy;
      const a0 = Math.atan2(cy + oy - ccy, cx - ccx);
      const a1 = Math.atan2(cy - ccy, cx + ox - ccx);
      let da = a1 - a0;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      groundPoly(ctx, [cx, cy, ...arcPts(ccx, ccy, 3, a0, da, 6)]);
    }
    // robotaxi bay
    groundPoly(ctx, [76, 53.5, 79.2, 57.5, 79.2, 70.5, 76, 74.5]);
  };

  // the glazed facades facing the camera: factory, dock wing (atrium and top band), pavilion, the home
  const litFaces: LitFace[] = [
    [26, 36, 26, 72, 1, 0], [-40, 72, 26, 72, 0, 1], [30, 26.6, 30, 35.4, 1, 0], [30, 0.4, 30, 25.6, 1, 0],
    [80, 38, 97, 38, 0, 1], [97, 26, 97, 38, 1, 0], [20.4, 84.2, 28.8, 84.2, 0, 1], [28.8, 75.6, 28.8, 84.2, 1, 0],
    ...outskirts.litFaces,
  ];
  const ground = (ctx: Ctx) => {
    // paved pads
    ctx.fillStyle = pal.pad;
    ctx.beginPath();
    // the truck yard, its gate off the avenue and its way out to the street
    groundRect(ctx, 30, -40, 66.4, 38.8);
    groundRect(ctx, 64, 6.4, 68.4, 28);
    groundRect(ctx, 64, -17.4, 68.4, -5);
    groundRect(ctx, 30, 72, 44, 140);
    groundRect(ctx, 54.5, 53, 66, 80.6);
    groundRect(ctx, 58.4, 50, 62.4, 53.2);
    groundRect(ctx, 51.8, 58.6, 54.7, 63.6);
    groundRect(ctx, 28.6, 85.2, 30, 89.8);
    groundRect(ctx, 54.5, 84.2, 66.4, 120);
    ctx.fill();
    outskirts.ground(ctx);
    // the truck's way out across the plaza corner
    ctx.strokeStyle = pal.pad;
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    lineW(ctx, 37, 75, 0, 45, 67, 0);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // a slightly lighter plaza in front of the factory and a lawn-ish park
    ctx.fillStyle = pal.plaza;
    ctx.beginPath();
    groundPoly(ctx, [26, 36, 41.6, 36, 41.6, 61.8, 37.4, 66.0, 37.4, 69.4, 26, 69.4]);
    groundPoly(ctx, [81, 53, 86, 53, 86, 64.2, 130, 64.2, 130, 100, 81, 100]);
    ctx.fill();
    // a grass verge between the truck yard and the avenue's pavement, broken where the semis turn in at the gate and
    // pull out across the exit (their trailers sweep those stretches)
    ctx.fillStyle = pal.lawn;
    ctx.beginPath();
    groundRect(ctx, 64.8, -40, 66.2, -17.8);
    groundRect(ctx, 64.8, -4.6, 66.2, 6.0);
    groundRect(ctx, 64.8, 28.4, 66.2, 38.6);
    ctx.fill();
    // the pocket park: grass with a path across it
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
    for (let i = 1; i < parkPath.length; i++) lineW(ctx, parkPath[i - 1][0], parkPath[i - 1][1], 0, parkPath[i][0], parkPath[i][1], 0);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // apron joints
    ctx.strokeStyle = pal.night ? 'rgba(255,255,255,0.03)' : 'rgba(120,122,136,0.10)';
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    for (let y = -36; y < 38; y += 6) lineW(ctx, 44.4, y, 0, 66.4, y, 0);
    for (let x = 48; x < 66; x += 6) lineW(ctx, x, -40, 0, x, 38.8, 0);
    for (let y = 78; y < 140; y += 6) lineW(ctx, 30, y, 0, 44, y, 0);
    ctx.stroke();

    // roads with curbs
    ctx.beginPath();
    roads(ctx);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = pal.curbHi;
    ctx.lineWidth = 0.62;
    ctx.stroke();
    ctx.strokeStyle = pal.curbLo;
    ctx.lineWidth = 0.26;
    ctx.stroke();
    ctx.fillStyle = pal.road;
    ctx.fill();

    // lane markings
    ctx.strokeStyle = pal.roadLine;
    ctx.lineWidth = 0.15;
    ctx.setLineDash([2.2, 2.6]);
    ctx.beginPath();
    lineW(ctx, 72, -100, 0, 72, 41.2, 0);
    lineW(ctx, 72, 50.8, 0, 72, 260, 0);
    lineW(ctx, 56, 46, 0, 67.4, 46, 0);
    lineW(ctx, 76.6, 46, 0, 260, 46, 0);
    lineW(ctx, 48, 54, 0, 48, 260, 0);
    const arc = arcPts(56, 54, 8, Math.PI, Math.PI / 2, 16);
    for (let i = 0; i < arc.length; i += 2) {
      const X = (arc[i] - arc[i + 1]) * C, Y = (arc[i] + arc[i + 1]) * 0.5;
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    lineW(ctx, 76.1, 54, 0, 76.1, 74, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    // stop lines
    ctx.lineWidth = 0.28;
    ctx.beginPath();
    lineW(ctx, 68.3, 41.2, 0, 71.8, 41.2, 0);
    lineW(ctx, 72.2, 50.8, 0, 75.7, 50.8, 0);
    lineW(ctx, 67.4, 46.2, 0, 67.4, 49.7, 0);
    lineW(ctx, 76.6, 42.3, 0, 76.6, 45.8, 0);
    ctx.stroke();
    // zebra crossings
    ctx.fillStyle = pal.roadLine;
    ctx.beginPath();
    for (let x = 44.4; x < 51.7; x += 0.9) groundRect(ctx, x, 63.25, x + 0.45, 65.75);
    for (let x = 68.4; x < 75.7; x += 0.9) groundRect(ctx, x, 33.25, x + 0.45, 35.75);
    for (let x = 68.4; x < 75.7; x += 0.9) groundRect(ctx, x, 80.25, x + 0.45, 82.75);
    for (let y = 42.4; y < 49.7; y += 0.9) groundRect(ctx, 86.25, y, 88.75, y + 0.45);
    ctx.fill();
    // charging stalls
    ctx.strokeStyle = pal.roadLine;
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    for (const sx of lot.stalls) {
      for (const dx of [-1.5, 1.5]) {
        lineW(ctx, sx + dx, 61.9, 0, sx + dx, 66.6, 0);
        lineW(ctx, sx + dx, 67.4, 0, sx + dx, 72.2, 0);
      }
    }
    lineW(ctx, 54.9, 67, 0, 65.6, 67, 0);
    ctx.stroke();
    ctx.setLineDash([1.6, 1.6]);
    ctx.beginPath();
    lineW(ctx, 61.9, -6, 0, 61.9, 38.4, 0);
    lineW(ctx, 58.1, 0, 0, 58.1, 38.4, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    // dock bays and the yard lane
    for (const y of [1.5, 7.5, 13.5, 19.5, 25.5]) lineW(ctx, 30.2, y, 0, 46, y, 0);
    // truck bay box
    lineW(ctx, 35.4, 73, 0, 35.4, 92.2, 0);
    lineW(ctx, 38.6, 73, 0, 38.6, 92.2, 0);
    ctx.stroke();
    // at night, light from the windows falls on the ground in front of the lit facades
    if (pal.night) windowSpill(ctx, litFaces);
  };

  // ------------------------------------------------------------------------------------------------- tick
  const update = (dt: number) => {
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = rr(rng, 1.0, 2.6) / density;
      let n = 0;
      for (const v of traffic.vehicles) if (v.legs.length === 1) n++;
      if (n < targetCars) spawnCar();
    }
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
