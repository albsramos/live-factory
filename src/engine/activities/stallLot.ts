// A car park whose cars come and go: an aisle along x, with stalls on either side of it.
//
// A car arrives heading +x on the aisle's inbound lane and waits at the entrance until nobody else is moving in the
// lot. It noses into its stall, charges for a while, then reverses out onto the outbound lane facing -x and drives
// off. One car moves in the lot at a time (the aisle is a mutex), which keeps the lanes clear without any zones.
// The way in is tagged 'in' and the way out 'out', so a zone at a shared driveway can keep them apart.
// Used for the charging hub east of the avenue and the staff car park south-west of the factory.

import { pick, rr } from '../core';
import { drawMesh } from '../mesh';
import { boxShadow, rectShadow } from '../ground';
import { H, HD, HW, drawChargeCable, drawChargerPost } from '../charging';
import { Path } from '../path';
import { FnItem } from '../statics';
import { MESH } from '../traffic/meshes';
import type { Vehicle } from '../traffic/vehicle';
import type { Leg } from '../traffic/legs';
import { Mutex, type Activity, type Env } from './activity';

const P = Path.poly;

export interface Stall {
  x: number;
  /** centre of a car parked in the stall */
  y: number;
  /** which way the nose points: -1 towards -y, 1 towards +y */
  dir: -1 | 1;
  /** a car comes and goes here (otherwise one stays parked, charging) */
  isLive: boolean;
}

export interface StallLotPlan {
  stalls: Stall[];
  /** aisle lanes: arriving cars drive +x along `laneIn`, leaving ones -x along `laneOut` */
  laneIn: number;
  laneOut: number;
  /** where an arriving car waits for the aisle, on `laneIn` */
  waitX: number;
  /** spawn point, and the route from it to (waitX, laneIn) */
  arrive: { pts: number[][]; radii: number[] };
  /**
   * The way out from a point on `laneOut`: `clear` ends where the car is out of the lot (it holds the aisle until
   * then), `away` carries on to where it leaves the scene.
   */
  depart: { clear: { pts: number[][]; radii: number[] }; away: { pts: number[][]; radii: number[] } };
  /** chargers stand at the head of each stall, this far beyond the nose */
  chargerGap: number;
  role: string;
  /** seconds between arrivals */
  every: [number, number];
}

export class StallLot implements Activity {
  private lot = new Mutex();
  private cars = new Map<Stall, Vehicle>();
  private incoming: Vehicle | null = null;
  private timer = 3;

  constructor(private env: Env, private plan: StallLotPlan) {
    const { pal, rng, statics } = env;
    for (const s of plan.stalls) {
      if (!s.isLive) {
        const kind = rng() < 0.65 ? 'car' : 'suv';
        const mats = [pick(rng, pal.paints), pal.carGlass, pal.tyre, pal.headlight, pal.taillight];
        statics.push(
          new FnItem(s.x - 1.0, s.y - 2.5, 0, s.x + 1.0, s.y + 2.5, 1.65, (r) => drawMesh(r, MESH[kind], s.x, s.y, 0, 0, s.dir, mats), (ctx) =>
            rectShadow(ctx, s.x, s.y, 0, s.dir, 2.35, 0.98, 1.2),
          ).still(),
        );
      }
      statics.push(this.charger(s));
    }
    // a couple already charging for the opening frame
    for (const s of plan.stalls.filter((t) => t.isLive).slice(0, 2)) this.seed(s);
  }

  /**
   * A charger at the head of a stall. A car that stays is plugged in and full; at a live stall the cable is hung on
   * the post until a car pulls in, then runs to its charge port and glows while it charges.
   */
  private charger(s: Stall) {
    const { pal } = this.env;
    // just right of the stall's centre line, clear of the canopy posts on the stall lines
    const px = s.x + 0.9, py = s.y + s.dir * (2.4 + this.plan.chargerGap);
    // from the post's right side to a port on the car's right flank, where the camera sees it
    const from = [px + HW, py, 1.2], port = [s.x + 0.96, s.y + s.dir * 1.2, 0.8];
    return new FnItem(px - HW, py - HD, 0, px + HW, py + HD, H, (r) => {
      const car = this.cars.get(s);
      const state = !s.isLive ? 'full' : car?.charging ? 'charging' : 'idle';
      drawChargerPost(r, pal, px, py, state);
      if (state !== 'idle') drawChargeCable(r, pal, from, port, state === 'charging');
    }, (ctx) => boxShadow(ctx, px - HW, py - HD, px + HW, py + HD, H));
  }

  private charge(dwell: number) {
    return {
      arrive: (v: Vehicle) => {
        this.lot.free(v);
        v.charging = true;
      },
      dwell,
      until: (v: Vehicle) => {
        v.charging = false;
        return this.lot.take(v);
      },
    };
  }

  /** In from the aisle: a left turn into a stall towards -y, a right turn into one towards +y. */
  private park(s: Stall): Leg {
    const { laneIn, waitX } = this.plan;
    const r = Math.min(2.5, Math.abs(s.y - laneIn) - 0.1, s.x - waitX - 0.1);
    return { path: P([[waitX, laneIn], [s.x, laneIn], [s.x, s.y]], [r]), vmax: 2.4, ghost: true, ...this.charge(rr(this.env.rng, 16, 34)) };
  }

  /** Back out onto the outbound lane, swinging round to face -x, then drive off. */
  private leave(s: Stall): Leg[] {
    const { laneOut, depart } = this.plan;
    const ex = s.x + 3;
    return [
      { path: P([[s.x, s.y], [s.x, laneOut], [ex, laneOut]], [3]), rev: true, vmax: 1.5, ghost: true },
      // the aisle stays ours until we are out of the lot, so nobody swings into a stall through us
      { path: P([[ex, laneOut], ...depart.clear.pts], [0, ...depart.clear.radii]), tag: 'out', vmax: 5, done: (v) => this.lot.free(v) },
      { path: P(depart.away.pts, depart.away.radii), vmax: 6, done: () => this.cars.delete(s) },
    ];
  }

  private spawn(s: Stall) {
    const { traffic, pal, rng } = this.env;
    const a = this.plan.arrive;
    const v = traffic.add(rng() < 0.6 ? 'car' : 'suv', pick(rng, pal.paints), [
      { path: P(a.pts, a.radii), tag: 'in', vmax: 7, until: (vv) => this.lot.take(vv), done: () => (this.incoming = null) },
      this.park(s),
      ...this.leave(s),
    ], this.plan.role);
    this.cars.set(s, v);
    this.incoming = v;
  }

  /** A car already in its stall, charging (for the opening frame). */
  private seed(s: Stall) {
    const { traffic, pal, rng } = this.env;
    const v = traffic.add(rng() < 0.6 ? 'car' : 'suv', pick(rng, pal.paints), [
      { path: P([[s.x, s.y - s.dir * 0.1], [s.x, s.y]]), vmax: 1, ghost: true, ...this.charge(rr(rng, 6, 26)), arrive: (vv: Vehicle) => (vv.charging = true) },
      ...this.leave(s),
    ], this.plan.role);
    this.cars.set(s, v);
  }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const { rng, traffic } = this.env;
    this.timer = rr(rng, this.plan.every[0], this.plan.every[1]);
    if (this.incoming?.dead) this.incoming = null;
    const free = this.plan.stalls.filter((s) => s.isLive && !this.cars.has(s));
    const [sx, sy] = this.plan.arrive.pts[0];
    // one car on its way in at a time, so nobody queues out into the road
    if (!this.incoming && free.length && traffic.clear(sx, sy, 8)) this.spawn(pick(rng, free));
  }
}
