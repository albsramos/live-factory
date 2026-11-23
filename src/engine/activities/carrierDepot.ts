// The carrier depot east of the avenue, north of the second compute hall (where a Megapack field stood): four full
// car carriers stand there ready to go, nose-in at chargers that keep them topped up. Along the depot's north edge
// runs a charging lane: about every two minutes a carrier comes in from the right, off the east road's southbound
// lane (a right turn, beyond the edge of every view) and along a service road north of the lake, charges at the
// lane's charger, then turns right onto the avenue's northbound lane and drives off north. No carrier comes up the
// avenue or crosses a lane, so the depot never holds up the junction.
// The service road crosses the north belt's path at a zebra and the east road's west pavement; pulling out onto the
// avenue, a trailer sweeps the east pavement north of the lane, which walkers cross as one crossing, and cars on the
// northbound lane leave a stretch to the carrier turning out (world/roads.ts, eastSide.ts).

import { type Mat, pick, rr, type Rng } from '../core';
import type { Ctx } from '../draw';
import { groundPoly } from '../ground';
import { Path } from '../path';
import { LOADS, SLOTS } from '../traffic/carrierMesh';
import type { Leg } from '../traffic/legs';
import { Vehicle } from '../traffic/vehicle';
import type { VehicleItem } from '../traffic/vehicleItem';
import type { Item } from '../sort';
import type { Activity, Env } from './activity';

const P = Path.poly;
/** where the parked cabs' noses are, and the parked carriers' centre lines, north first */
export const DEPOT_NOSE = 81;
export const DEPOT_ROWS = [-36, -31.6, -27.2, -22.8] as const;
/** the charging lane along the depot's north edge, and the charging carrier's reference point there */
export const LANE_Y = -41.8;
export const LANE_REF = 85;
/** the service road from the east road (x 144, southbound) along y −52.5, and the bend down to the lane */
export const ROAD_Y = -52.5;
export const ROAD_BEND: readonly (readonly [number, number])[] = [[120, ROAD_Y], [104, LANE_Y]];
const AVENUE = 74;
/** a carrier is out on the avenue, clear of the pavement and the lane, this far up it */
const CLEAR = 24;

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

  constructor(private env: Env, private rng: Rng) {
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

  /** In off the east road and along the service road to the lane's charger; charge; out onto the avenue, north. */
  private arrive() {
    const { traffic, pal } = this.env;
    const y = LANE_Y;
    const legs: Leg[] = [
      { path: P([[144, -120], [144, -64]]), vmax: 5.5 },
      { path: P([[144, -64], [144, ROAD_Y], ...ROAD_BEND, [LANE_REF, y]], [7, 9, 9]), vmax: 4.5, dwell: rr(this.rng, 50, 90), arrive: (v) => {
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
    if (this.env.traffic.clear(144, -120, 18)) {
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

  /** The charging lane, the service road and its bend, and the corner the trailers cut pulling out onto the avenue. */
  ground(ctx: Ctx) {
    ctx.fillStyle = this.env.pal.pad;
    ctx.beginPath();
    groundPoly(ctx, [78.8, -38.4, 78.8, -47.5, 81.2, -46.4, 84, -43.6, 101, -43.6, 104.6, -44.9, 117.6, -54.1, 146, -54.1, 146, -50.9, 121, -50.9, 107, -41.5, 103, -39.9, 101, -38.4]);
    ctx.fill();
    // a zebra where the north belt's path crosses the bend
    ctx.fillStyle = this.env.pal.plaza;
    ctx.beginPath();
    for (let x = 108.4; x < 115.6; x += 0.9) groundPoly(ctx, [x, -48.1, x + 0.45, -48.1, x + 0.45, -45.9, x, -45.9]);
    ctx.fill();
  }
}
