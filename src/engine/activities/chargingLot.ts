// Charging lot: three live stalls (cars pull in nose first, charge, back out and leave) and three parked cars.

import { pick, rr, type Mat } from '../core';
import { boxShadow, rectShadow } from '../ground';
import { H, HD, HW, drawChargeCable, drawChargerPost } from '../charging';
import { drawMesh } from '../mesh';
import { Path } from '../path';
import { FnItem } from '../statics';
import { MESH } from '../traffic/meshes';
import type { Vehicle } from '../traffic/vehicle';
import type { Leg } from '../traffic/legs';
import { type Activity, type Env, Mutex } from './activity';

const P = Path.poly;
export class ChargingLot implements Activity {
  readonly stalls = [56.2, 59.2, 62.2];
  private busy = [false, false, false];
  private cars: (Vehicle | null)[] = [null, null, null];
  private lot = new Mutex();
  /** the car driving in and queueing for the lot, if any */
  private incoming: Vehicle | null = null;
  private timer = 1;
  private parked: { x: number; paint: Mat }[] = [];

  constructor(private env: Env) {
    const { pal, rng, statics } = env;
    // the south row stays parked and charging
    for (const x of this.stalls) this.parked.push({ x, paint: pick(rng, pal.paints) });
    for (const p of this.parked) {
      const mats = [p.paint, pal.carGlass, pal.tyre, pal.headlight, pal.taillight];
      statics.push(
        new FnItem(p.x - 1.0, 67.6, 0, p.x + 1.0, 72.4, 1.45, (r) => drawMesh(r, MESH.car, p.x, 70.0, 0, 0, -1, mats), (ctx) =>
          rectShadow(ctx, p.x, 70, 0, -1, 2.3, 0.95, 1.1),
        ).still(),
      );
    }
    // a charger between the two rows for each pair of stalls: the parked car behind is plugged in and full, and the
    // cable to the stall in front glows while a car charges there
    this.stalls.forEach((x, i) => {
      const px = x + 1.5, py = 67;
      statics.push(
        new FnItem(px - HW, py - HD, 0, px + HW, py + HD, H, (r) => {
          const on = !!this.cars[i]?.charging;
          drawChargerPost(r, pal, px, py, on ? 'charging' : 'full');
          // from the post's right side to a port on the charging car's right flank, where the camera sees it
          if (on) drawChargeCable(r, pal, [px + HW, py, 1.2], [x + 0.96, 65.3, 0.8], true);
          drawChargeCable(r, pal, [px - HW, py + HD, 1.2], [x + 0.75, 67.9, 0.75], false);
        }, (ctx) => boxShadow(ctx, px - HW, py - HD, px + HW, py + HD, H)),
      );
    });
  }

  /** Back straight out of stall i, swing round to face the exit, cross the lot and join the factory road. */
  private leave(i: number, sx: number): Leg[] {
    // a wide swing keeps the nose on the lot rather than over the factory-road pavement; the end stall swings back
    // less, so its tail stays off the avenue pavement
    const ex = Math.min(sx + 3, 63.2);
    return [
      { path: P([[sx, 64.2], [sx, 60.3], [ex, 60.3]], [ex - sx]), rev: true, vmax: 1.5, ghost: true },
      // waits for the pavement and a gap on the road before crossing; the lot stays ours until we are out on the
      // road, so the next car can't drive into us while we wait to merge
      { path: P([[ex, 60.3], [50.5, 60.3]]), vmax: 2.8, done: (vv) => {
        this.lot.free(vv);
        this.busy[i] = false;
        this.cars[i] = null;
      } },
      { path: P([[50.5, 60.3], [46, 60.3], [46, 135]], [3]), vmax: 7 },
    ];
  }

  private charge(dwell: number) {
    return {
      arrive: (vv: Vehicle) => {
        this.lot.free(vv);
        vv.charging = true;
      },
      dwell,
      until: (vv: Vehicle) => {
        vv.charging = false;
        return this.lot.take(vv);
      },
    };
  }

  private spawn(i: number) {
    const { traffic, pal, rng } = this.env;
    const sx = this.stalls[i];
    this.busy[i] = true;
    const kind = rng() < 0.6 ? 'car' : 'suv';
    const v = traffic.add(kind, pick(rng, pal.paints), [
      // wait for the lot inside its entrance, well clear of the street and of trucks swinging round the bend
      { path: P([[50, 135], [50, 48], [60.4, 48], [60.4, 55.6]], [6, 2.5]), vmax: 7, until: (vv) => this.lot.take(vv), done: () => (this.incoming = null) },
      { path: P([[60.4, 55.6], [60.4, 57.5], [sx, 61.5], [sx, 64.2]], [2, 2]), vmax: 2.4, ghost: true, ...this.charge(rr(rng, 14, 30)) },
      ...this.leave(i, sx),
    ], 'lot');
    this.cars[i] = v;
    this.incoming = v;
  }

  /** Put a car straight into a stall (for the opening frame). */
  seed(i: number) {
    const { traffic, pal, rng } = this.env;
    const sx = this.stalls[i];
    this.busy[i] = true;
    const v = traffic.add(rng() < 0.6 ? 'car' : 'suv', pick(rng, pal.paints), [
      { path: P([[sx, 64.1], [sx, 64.2]]), vmax: 1, ghost: true, ...this.charge(rr(rng, 4, 20)), arrive: (vv: Vehicle) => (vv.charging = true) },
      ...this.leave(i, sx),
    ], 'lot');
    this.cars[i] = v;
  }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = rr(this.env.rng, 5, 11);
    // one car on its way in at a time, so nobody queues out into the street
    if (this.incoming && this.incoming.dead) this.incoming = null;
    const free = this.busy.map((b, i) => (b ? -1 : i)).filter((i) => i >= 0);
    if (!this.incoming && free.length && this.env.traffic.clear(50, 135, 8)) this.spawn(pick(this.env.rng, free));
  }
}
