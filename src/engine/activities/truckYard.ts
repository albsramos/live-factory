// Truck yard at the factory docks. A semi turns in off the avenue, waits at the gate until the yard is clear,
// drives down the yard lane past its dock, backs in, loads, then pulls straight out and turns onto the avenue.

import { pick, rr } from '../core';
import { Path } from '../path';
import { backingTrack, type Leg } from '../traffic/legs';
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
  private mutex = new Mutex();
  private timer = 4;
  private trucks = 0;

  constructor(private env: Env, dockYs: number[]) {
    this.docks = dockYs.map((y) => ({ y, loading: false, taken: false }));
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

  private afterDocked(d: Dock, dwell: number): Leg[] {
    const y = d.y;
    return [
      { path: P([[44.5, d.y], [44.6, d.y]]), vmax: 1, ghost: true, dwell, until: (v) => {
        if (!this.mutex.take(v)) return false;
        d.loading = false;
        return true;
      } },
      // pull out across the yard to the lower row and stop short of the pavement, so the exit can be reserved
      // before the cab is on it; turning out from the lower row keeps the trailer on the paved exit
      { path: P(y > 10.5 ? [[44.6, y], [50, y], [56, 10.5], [58, 10.5]] : [[44.6, y], [58, y]], y > 10.5 ? [3, 3] : []), vmax: 2.4, ghost: true },
      // turn right onto the avenue's near lane, never crossing traffic
      { path: P([[58, 10.5], [70, 10.5], [70, 22]], [6]), vmax: 4, done: (v) => {
        this.mutex.free(v);
        d.taken = false;
      } },
      // straight before it waits for the crossing and the junction
      { path: P([[70, 22], [70, 112]]), vmax: 5.5, done: () => this.trucks-- },
    ];
  }

  private spawn(d: Dock) {
    const { traffic, pal, rng } = this.env;
    const L = TruckYard.LANE;
    const { stop, out, back } = this.geometry(d);
    d.taken = true;
    this.trucks++;
    const legs: Leg[] = [
      // off the avenue and through the gate, then wait for the yard
      { path: P([[70, -52], [70, -8], [L, -8], [L, TruckYard.GATE]], [3, 5]), vmax: 5, until: (v) => this.mutex.take(v) },
      { path: P([[L, TruckYard.GATE], [L, stop]]), vmax: 3.5 },
      // back in along the pull-out curve, the trailer leading
      {
        path: back,
        rev: true,
        vmax: 1.3,
        ghost: true,
        trailerAngle: backingTrack(out, Math.PI / 2),
        done: (v) => {
          this.mutex.free(v);
          d.loading = true;
        },
      },
      ...this.afterDocked(d, rr(rng, 14, 24)),
    ];
    const v = traffic.add('semi', rng() < 0.8 ? pal.white : pal.paints[2], legs);
    v.mats[5] = pal.white;
  }

  /** A truck already backed in and loading, for the opening frame. */
  seed(i: number, dwell: number) {
    const { traffic, pal } = this.env;
    const d = this.docks[i];
    d.taken = true;
    d.loading = true;
    this.trucks++;
    const v = traffic.add('semi', pal.white, this.afterDocked(d, dwell));
    v.mats[5] = pal.white;
  }

  update(dt: number) {
    // one truck in the yard at a time, with a pause after it leaves
    if (this.trucks > 0) {
      this.timer = Math.max(this.timer, rr(this.env.rng, 10, 20));
      return;
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    const free = this.docks.filter((d) => !d.taken);
    if (free.length && this.env.traffic.clear(70, -52, 18)) this.spawn(pick(this.env.rng, free));
    else this.timer = 2;
  }
}
