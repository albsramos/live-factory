// Truck yard at the factory docks. A semi turns in off the avenue, waits at the gate until the yard is clear,
// drives down the yard lane past its dock, backs in and loads. Then it pulls out, drives down the lane again and
// backs into the charging bay beside the docks, charges, and pulls out across the yard onto the avenue.
// One semi moves in the yard at a time (the mutex). A second may come in and load while the first charges: neither
// one's sweep touches the other parked (docs/simulation.md); it waits at its dock until the bay is free.

import { pick, rr } from '../core';
import { Path } from '../path';
import { backingTrack, type Leg } from '../traffic/legs';
import type { Vehicle } from '../traffic/vehicle';
import { type Activity, type Env, Mutex } from './activity';

const P = Path.poly;
export interface Dock {
  y: number;
  /** a truck is backed in and being loaded */
  loading: boolean;
  /** a truck is on its way to, at, or leaving this dock */
  taken: boolean;
}

export class TruckYard implements Activity {
  /** yard lane x, and where a waiting truck stops at the gate */
  static readonly LANE = 60;
  static readonly GATE = -3;
  readonly docks: Dock[];
  /** the charging bay: `loading` while a semi is plugged in and charging */
  readonly bay: Dock;
  private mutex = new Mutex();
  private timer = 4;
  /** semis on their way to a dock or loading there, not yet given the bay */
  private inbound = 0;

  constructor(private env: Env, dockYs: number[], bayY: number) {
    this.docks = dockYs.map((y) => ({ y, loading: false, taken: false }));
    this.bay = { y: bayY, loading: false, taken: false };
  }

  /** The tractor's pose when backed in, the pull-out curve, and where it ends on the lane. */
  private geometry(d: Dock) {
    const L = TruckYard.LANE, y = d.y;
    // pull out far enough down the lane for the trailer to straighten, but stop short of the pavement
    const stop = Math.min(y + 25, 35.5);
    return {
      stop,
      out: P([[44.6, y], [L, y], [L, stop]], [9]),
      back: P([[L, stop], [L, y], [44.6, y]], [9]),
    };
  }

  /** Back in along the pull-out curve from the lane, the trailer leading. */
  private backIn(d: Dock, done: (v: Vehicle) => void): Leg {
    const { out, back } = this.geometry(d);
    return { path: back, rev: true, vmax: 1.3, ghost: true, trailerAngle: backingTrack(out, Math.PI / 2), done };
  }

  /** Load at a dock, then pull out down the lane and back into the charging bay. */
  private afterDocked(d: Dock, dwell: number): Leg[] {
    const L = TruckYard.LANE, y = d.y;
    const bay = this.bay;
    return [
      { path: P([[44.5, y], [44.6, y]]), vmax: 1, ghost: true, dwell, until: (v) => {
        // the bay must be free, and the yard ours to move in
        if (bay.taken || !this.mutex.take(v)) return false;
        bay.taken = true;
        d.loading = false;
        this.inbound--;
        return true;
      } },
      // out of the dock, round onto the lane and down it, far enough for the trailer to straighten
      { path: P([[44.6, y], [L, y], [L, this.geometry(bay).stop]], [9]), vmax: 2.4, ghost: true, done: () => (d.taken = false) },
      this.backIn(bay, (v) => {
        this.mutex.free(v);
        bay.loading = true;
        v.charging = true;
      }),
      ...this.afterCharged(rr(this.env.rng, 30, 45)),
    ];
  }

  /** Charge in the bay, then pull out across the yard and turn onto the avenue. */
  private afterCharged(dwell: number): Leg[] {
    const bay = this.bay, y = bay.y;
    return [
      { path: P([[44.5, y], [44.6, y]]), vmax: 1, ghost: true, dwell, until: (v) => {
        if (!this.mutex.take(v)) return false;
        bay.loading = false;
        v.charging = false;
        return true;
      } },
      // pull out across the yard to the lower row and stop short of the pavement, so the exit can be reserved
      // before the cab is on it; turning out from the lower row keeps the trailer on the paved exit
      { path: P(y > 10.5 ? [[44.6, y], [50, y], [56, 10.5], [58, 10.5]] : [[44.6, y], [58, y]], y > 10.5 ? [3, 3] : []), vmax: 2.4, ghost: true },
      // turn right onto the avenue's near lane, never crossing traffic
      { path: P([[58, 10.5], [70, 10.5], [70, 22]], [6]), vmax: 4 },
      // the yard is free once the trailer has followed it out (the cab may have to wait in the avenue's queue, and
      // until it has straightened up the trailer still reaches back across the yard lane)
      { path: P([[70, 22], [70, 28]]), vmax: 5.5, done: (v) => {
        this.mutex.free(v);
        bay.taken = false;
      } },
      // straight before it waits for the crossing and the junction
      { path: P([[70, 28], [70, 175]]), vmax: 5.5 },
    ];
  }

  private spawn(d: Dock) {
    const { traffic, pal, rng } = this.env;
    const L = TruckYard.LANE;
    const { stop } = this.geometry(d);
    d.taken = true;
    this.inbound++;
    const legs: Leg[] = [
      // off the avenue and through the gate, then wait for the yard
      { path: P([[70, -120], [70, -8], [L, -8], [L, TruckYard.GATE]], [3, 5]), vmax: 5, until: (v) => this.mutex.take(v) },
      { path: P([[L, TruckYard.GATE], [L, stop]]), vmax: 3.5 },
      this.backIn(d, (v) => {
        this.mutex.free(v);
        d.loading = true;
      }),
      ...this.afterDocked(d, rr(rng, 14, 24)),
    ];
    const v = traffic.add('semi', rng() < 0.8 ? pal.white : pal.paints[2], legs);
    v.mats[5] = pal.white;
  }

  /** A truck already backed into the charging bay and charging, for the opening frame. */
  seedCharging(dwell: number) {
    const { traffic, pal } = this.env;
    this.bay.taken = true;
    this.bay.loading = true;
    const v = traffic.add('semi', pal.white, this.afterCharged(dwell));
    v.mats[5] = pal.white;
    v.charging = true;
  }

  update(dt: number) {
    // one truck coming in to load at a time, with a pause after it has gone on to the bay (shorter than it was, now
    // that trucks start further out, beyond the world box, so they keep coming as often)
    if (this.inbound > 0) {
      this.timer = Math.max(this.timer, rr(this.env.rng, 2, 9));
      return;
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    const free = this.docks.filter((d) => !d.taken);
    if (free.length && this.env.traffic.clear(70, -120, 18)) this.spawn(pick(this.env.rng, free));
    else this.timer = 2;
  }
}
