// The carrier depot east of the avenue, north of the second compute hall (where a Megapack field stood): full car
// carriers stand nose-in at chargers in four spots, one above the other, the cables to their cabs glowing. Now and
// then the north-most one pulls out, turns right onto the avenue's northbound lane, never crossing traffic, and
// drives off north; and now and then a new one comes up that lane, stops past the free spot and backs into it, the
// way the truck yard's semis back into the docks.
// Pulling out, a trailer cuts the corner across every spot north of its own, so the spots fill and empty like a
// stack: the north-most carrier is the only one that leaves, and a newcomer takes the spot just north of it (the
// south-most when the depot is empty). One carrier moves at a time (the mutex). Turning out and backing in, the
// trailers sweep the pavement for some 24 m north of a spot: walkers cross that stretch as one crossing (`DC` in
// world/roads.ts); and each spot has its stretch of the northbound lane, which a carrier for that spot waits to find
// empty and cars then leave to it (world/roads.ts; its legs carry the tag `depot<k>`).

import { type Mat, pick, rr, type Rng } from '../core';
import type { Ctx } from '../draw';
import { groundPoly } from '../ground';
import { Path } from '../path';
import { LOADS, SLOTS } from '../traffic/carrierMesh';
import { backingTrack, type Leg } from '../traffic/legs';
import { type Activity, type Env, Mutex } from './activity';

const P = Path.poly;
/** where the parked cabs' noses are, and the spots' centre lines, north first */
export const DEPOT_NOSE = 81;
export const DEPOT_ROWS = [-36, -31.6, -27.2, -22.8] as const;
/** the tractor's reference point when parked, and the turn onto the lane */
const REF = DEPOT_NOSE + 3.15;
const LANE = 74;
const R = 6;
/** how far up the lane a newcomer stops before backing in, and how far a leaver drives before the depot is free */
const PAST = 20;
const CLEAR = 24;

export interface DepotSpot {
  y: number;
  /** a carrier is parked here charging: its charger's cable glows (world/chargers.ts) */
  loading: boolean;
  /** a carrier is parked here, on its way in, or pulling out */
  taken: boolean;
}

export class CarrierDepot implements Activity {
  readonly spots: DepotSpot[] = DEPOT_ROWS.map((y) => ({ y, loading: false, taken: false }));
  private mutex = new Mutex();
  private timer = 25;
  private arriving = false;

  constructor(private env: Env, private rng: Rng) {}

  private paint(): Mat {
    const { pal } = this.env;
    return this.rng() < 0.55 ? pal.paints[0] : pick(this.rng, pal.paints);
  }

  private carrier(legs: Leg[]) {
    const { traffic, pal } = this.env;
    const v = traffic.add('semi', pal.white, legs, 'carrier');
    v.mats[5] = pal.white;
    LOADS.set(v, SLOTS.map((slot) => ({ slot, paint: this.paint(), l: slot.l })));
    return v;
  }

  /** The north-most spot taken, or the number of spots when none is. */
  private top() {
    const i = this.spots.findIndex((s) => s.taken);
    return i < 0 ? this.spots.length : i;
  }

  /** Charge, then, once this is the north-most carrier and the depot is free, pull out and drive off north. */
  private charge(k: number, dwell: number): Leg[] {
    const s = this.spots[k], y = s.y;
    return [
      { path: P([[REF + 0.1, y], [REF, y]]), vmax: 1, ghost: true, dwell, until: (v) => {
        if (this.arriving || this.top() !== k || !this.mutex.take(v)) return false;
        s.loading = false;
        return true;
      } },
      // out of the spot and right onto the northbound lane; the spot and the depot are free once the trailer is out
      { path: P([[REF, y], [LANE, y], [LANE, y - CLEAR]], [R]), tag: `depot${k}`, vmax: 3.5, done: (v) => {
        s.taken = false;
        this.mutex.free(v);
        this.timer = Math.max(this.timer, rr(this.rng, 6, 16));
      } },
      { path: P([[LANE, y - CLEAR], [LANE, -140]]), vmax: 5.5 },
    ];
  }

  /** A carrier already charging in spot `k`, for the opening frame. */
  seed(k: number, dwell: number) {
    const s = this.spots[k];
    s.taken = true;
    s.loading = true;
    this.carrier(this.charge(k, dwell));
  }

  /** A newcomer for spot `k`: up the northbound lane, past the spot, then back in along the way a leaver pulls out. */
  private arrive(k: number) {
    const s = this.spots[k], y = s.y;
    s.taken = true;
    this.arriving = true;
    const out = P([[REF, y], [LANE, y], [LANE, y - PAST]], [R]);
    const back = P([[LANE, y - PAST], [LANE, y], [REF, y]], [R]);
    this.carrier([
      // two legs, so the zones round the junction and those by the depot are reserved apart (docs/simulation.md)
      { path: P([[LANE, 175], [LANE, 30]]), vmax: 5.5 },
      { path: P([[LANE, 30], [LANE, y - PAST]]), tag: `depot${k}`, vmax: 4.5, until: (v) => this.mutex.take(v) },
      { path: back, tag: `depot${k}`, rev: true, vmax: 2.0, ghost: true, trailerAngle: backingTrack(out, -Math.PI / 2), done: (v) => {
        this.mutex.free(v);
        this.arriving = false;
        s.loading = true;
      } },
      ...this.charge(k, rr(this.rng, 360, 520)),
    ]);
  }

  /** The corner north of the depot that the trailers cut across, onto the lawn (measured: to y −43.4 at x 79). */
  ground(ctx: Ctx) {
    ctx.fillStyle = this.env.pal.pad;
    ctx.beginPath();
    groundPoly(ctx, [78.8, -38.4, 78.8, -44.4, 80.6, -43.4, 83.4, -39.2, 83.4, -38.4]);
    ctx.fill();
  }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0 || this.arriving) return;
    // a newcomer now and then, for the spot north of the north-most carrier, while the depot is free
    const k = this.top() - 1;
    if (k >= 0 && !this.mutex.owner && this.env.traffic.clear(LANE, 175, 18)) {
      this.arrive(k);
      this.timer = rr(this.rng, 6, 18);
    } else this.timer = 3;
  }
}
