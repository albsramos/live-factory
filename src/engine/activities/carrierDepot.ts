// The carrier depot east of the avenue, north of the second compute hall (where a Megapack field stood): four full
// car carriers stand there ready to go, nose-in at chargers that keep them topped up. Along the depot's north edge
// runs a charging lane: about every two minutes a carrier comes down the avenue's southbound lane from off the top
// edge, drives on past the lane and backs straight into it (across the northbound lane and the east pavement, its
// trailer leading), charges at the lane's charger, then turns right onto the avenue's northbound lane and drives
// off north. The depot never reaches the junction, and nothing else comes or goes behind it: north of the lane
// lies the north belt's lawn.
// Backing in, the carrier holds the stretch of the southbound lane it reverses up and the northbound lane and
// pavement its trailer swings across; pulling out, its trailer sweeps the east pavement north of the lane. Walkers
// cross that whole stretch of pavement as one crossing, and cars leave the lanes to the carrier (world/roads.ts).

import { type Mat, pick, rr, type Rng } from '../core';
import type { Ctx } from '../draw';
import { groundPoly } from '../ground';
import { Path } from '../path';
import { LOADS, SLOTS } from '../traffic/carrierMesh';
import { backingTrack, type Leg } from '../traffic/legs';
import { Vehicle } from '../traffic/vehicle';
import type { VehicleItem } from '../traffic/vehicleItem';
import type { Item } from '../sort';
import type { Zone } from '../traffic/zone';
import type { Activity, Env } from './activity';

const P = Path.poly;
/** where the parked cabs' noses are, and the parked carriers' centre lines, north first */
export const DEPOT_NOSE = 81;
export const DEPOT_ROWS = [-36, -31.6, -27.2, -22.8] as const;
/** the charging lane along the depot's north edge, and the charging carrier's reference point there */
export const LANE_Y = -41.8;
export const LANE_REF = 85;
/** the avenue's southbound and northbound lanes */
const SB = 70;
const AVENUE = 74;
/** a carrier is out on the avenue, clear of the pavement and the lane, this far up it */
const CLEAR = 24;
/** how far past the lane a carrier coming down the avenue drives before it backs in */
export const PAST = 20;
/** the pull-out the back-in replays: from the lane's charger, left onto the southbound lane and down it */
const OUT = Path.poly([[LANE_REF, LANE_Y], [SB, LANE_Y], [SB, LANE_Y + PAST]], [6]);
// (stopping 0.1 m short, so the charge is a leg of its own: a reversing carrier's zones are only let go on a later
// leg, since its trailer leads)
const BACK = Path.poly([[SB, LANE_Y + PAST], [SB, LANE_Y], [LANE_REF + 0.1, LANE_Y]], [6]);

/** The zones a carrier backing in swings its trailer across, which it takes before it sets off backwards. */
export interface DepotZones {
  /** the stretch of the northbound lane by the depot that its trailer swings across */
  lane: Zone;
  /** the east pavement by the depot */
  pavement: Zone;
}

export interface DepotSpot {
  y: number;
  /** a carrier is plugged in here: its charger's cable glows (world/chargers.ts) */
  loading: boolean;
}

export class CarrierDepot implements Activity {
  /** the parked carriers' spots (always taken), then the charging lane's */
  readonly spots: DepotSpot[] = DEPOT_ROWS.map((y) => ({ y, loading: true }));
  readonly lane: DepotSpot = { y: LANE_Y, loading: false };
  private parked: Vehicle[] = [];
  /** a carrier is on its way in, charging, or pulling out */
  private busy = false;
  private timer = 20;

  constructor(private env: Env, private rng: Rng, private zones: DepotZones) {
    const { pal, traffic } = env;
    // the parked carriers: scenery, not traffic (nothing that moves comes near them)
    for (const y of DEPOT_ROWS) {
      const v = new Vehicle('semi', pal, pal.white, [{ path: P([[DEPOT_NOSE + 3.25, y], [DEPOT_NOSE + 3.15, y]]), vmax: 1 }], traffic, 'carrier');
      v.mats[5] = pal.white;
      // parked: lights off
      v.door = 0.02;
      LOADS.set(v, SLOTS.map((slot) => ({ slot, paint: this.paint(), l: slot.l })));
      this.parked.push(v);
    }
  }

  private paint(): Mat {
    const { pal } = this.env;
    return this.rng() < 0.55 ? pal.paints[0] : pick(this.rng, pal.paints);
  }

  /** Down the avenue past the lane, back into it; charge; out onto the avenue, north. */
  private arrive() {
    const { traffic, pal } = this.env;
    const y = LANE_Y;
    const { lane, pavement } = this.zones;
    const legs: Leg[] = [
      // down the southbound lane (holding the stretch it will back up) and on past the lane; it backs in once the
      // northbound lane and the pavement its trailer swings across are its own
      { path: P([[SB, -120], [SB, y + PAST]]), tag: 'depot', vmax: 5.5, until: (v) => {
        // both asked every time, so it keeps its place in each queue
        const free = [lane.ask(v, 'semi'), pavement.ask(v, 'car')];
        if (!free[0] || !free[1]) return false;
        for (const [z, key] of [[lane, 'semi'], [pavement, 'car']] as const) {
          z.enter(v, key);
          v.held.add(z);
        }
        return true;
      } },
      { path: BACK, rev: true, tag: 'depot', vmax: 1.6, ghost: true, trailerAngle: backingTrack(OUT, Math.PI / 2) },
      { path: P([[LANE_REF + 0.1, y], [LANE_REF, y]]), vmax: 1, ghost: true, dwell: rr(this.rng, 50, 90), arrive: (v) => {
        this.lane.loading = true;
        v.charging = true;
      }, until: (v) => {
        this.lane.loading = false;
        v.charging = false;
        return true;
      } },
      // right onto the northbound lane; the depot is free once the trailer is out on the avenue
      { path: P([[LANE_REF, y], [AVENUE, y], [AVENUE, y - CLEAR]], [6]), tag: 'depot', vmax: 3.5, done: () => (this.busy = false) },
      { path: P([[AVENUE, y - CLEAR], [AVENUE, -140]]), vmax: 5.5 },
    ];
    const v = traffic.add('semi', pal.white, legs, 'carrier');
    v.mats[5] = pal.white;
    LOADS.set(v, SLOTS.map((slot) => ({ slot, paint: this.paint(), l: slot.l })));
    this.busy = true;
  }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0 || this.busy) return;
    if (this.env.traffic.clear(SB, -120, 18)) {
      this.arrive();
      this.timer = rr(this.rng, 100, 140);
    } else this.timer = 3;
  }

  items(out: Item[]) {
    for (const v of this.parked) for (const it of v.items) {
      (it as VehicleItem).bounds();
      out.push(it);
    }
  }

  shadows(ctx: Ctx) {
    for (const v of this.parked) v.shadow(ctx);
  }

  /** The charging lane, and the corner the trailers cut pulling out onto the avenue. */
  ground(ctx: Ctx) {
    ctx.fillStyle = this.env.pal.pad;
    ctx.beginPath();
    groundPoly(ctx, [78.8, -38.4, 78.8, -47.5, 81.2, -46.4, 84, -43.6, 102.9, -43.6, 102.9, -38.4]);
    ctx.fill();
  }
}
