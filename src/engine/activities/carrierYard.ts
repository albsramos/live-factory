// The north yard: car carriers load new SUVs for delivery. A carrier comes down a service road from the north
// (x 34, off the top of every view), turns into one of two lanes north of the Megapacks and stops. New cars drive out
// from behind the factory (where no view sees them start), up the yard's west side and onto the carrier's ramp,
// filling its upper deck front first, then its lower one. Full, it drives on to the yard's east side and turns up a
// second service road (x 62.5) back north, off the top of every view. Neither road touches the avenue, so the
// carriers never meet its traffic; each crosses the north belt's path at a zebra (`NB`, `NB2` in world/roads.ts).
// One thing moves in the yard at a time (the `yard` lock): a carrier coming in or going out, or a car on its way to
// a ramp. And the south lane's carrier only leaves once the north lane is empty: turning up the east road, its
// trailer cuts the corner across the front of the north lane. The cars are scripted, not traffic: they never leave
// the yard.

import { type Mat, pick, rr } from '../core';
import type { Ctx, R } from '../draw';
import { groundPoly, groundRect, rectShadow } from '../ground';
import { BELT_Y } from '../world/northBelt';
import { drawMesh } from '../mesh';
import { Path, type Pose } from '../path';
import type { Item } from '../sort';
import { LOADS, RAMP_FOOT, SLOTS, type DeckCar } from '../traffic/carrierMesh';
import type { Leg } from '../traffic/legs';
import { MESH } from '../traffic/meshes';
import type { Vehicle } from '../traffic/vehicle';
import { type Activity, type Env, Mutex } from './activity';

const P = Path.poly;
/** the service road down from the north, and where a carrier waits for the yard, out of every view */
export const ROAD_X = 34;
const WAIT_Y = -58;
/** the service road back north, and how far up it a carrier's trailer is out of the yard */
export const EXIT_X = 62.5;
const CLEAR_Y = -56;
/** the lanes: where a carrier stops (its reference point), north lane first */
export const LANES = [
  { y: -38.5, stop: 55 },
  { y: -29.5, stop: 55 },
] as const;
/** where the cars come out from behind the factory, and the way they drive up the west side */
const CAR_START = [16, -3] as const;
const CAR_X = 32.5;

interface Lane {
  y: number;
  stop: number;
  carrier: Vehicle | null;
  /** cars sent to it so far, on their way or on board */
  sent: number;
  full: boolean;
}

interface Car {
  path: Path;
  s: number;
  pose: Pose;
  paint: Mat;
  lane: Lane;
  item: Item;
}

export class CarrierYard implements Activity {
  private lanes: Lane[] = LANES.map((l) => ({ ...l, carrier: null, sent: 0, full: false }));
  private yard = new Mutex();
  private cars: Car[] = [];
  private timer = 6;
  private carTimer = 2;

  constructor(private env: Env) {}

  /** Mostly white, now and then another of the SUV's paints. */
  private paint(): Mat {
    const { pal, rng } = this.env;
    return rng() < 0.55 ? pal.paints[0] : pick(rng, pal.paints);
  }

  /** Stand loading until the carrier is full, then drive on and up the east road, back north. */
  private load(lane: Lane): Leg[] {
    const y = lane.y;
    return [
      { path: P([[lane.stop - 0.1, y], [lane.stop, y]]), vmax: 1, ghost: true, dwell: 2, until: (v) => {
        if (!lane.full || (lane !== this.lanes[0] && this.lanes[0].carrier) || !this.yard.take(v)) return false;
        lane.carrier = null;
        lane.sent = 0;
        lane.full = false;
        return true;
      } },
      { path: P([[lane.stop, y], [EXIT_X, y], [EXIT_X, CLEAR_Y]], [7]), vmax: 3, done: (v) => this.yard.free(v) },
      { path: P([[EXIT_X, CLEAR_Y], [EXIT_X, -130]]), vmax: 5.5 },
    ];
  }

  private spawn(lane: Lane) {
    const { traffic, pal } = this.env;
    const y = lane.y;
    const v = traffic.add('semi', pal.white, [
      // down the service road, then wait out of view for the yard
      { path: P([[ROAD_X, -120], [ROAD_X, WAIT_Y]]), vmax: 5, until: (v) => this.yard.take(v) },
      // round into the lane; its trailer is clear of the west side once it stops
      { path: P([[ROAD_X, WAIT_Y], [ROAD_X, y], [lane.stop, y]], [8]), vmax: 3.5, done: (v) => this.yard.free(v) },
      ...this.load(lane),
    ], 'carrier');
    v.mats[5] = pal.white;
    LOADS.set(v, []);
    lane.carrier = v;
  }

  /** A carrier already standing in a lane with `n` cars on it, for the opening frame. */
  seed(i: number, n: number) {
    const { traffic, pal } = this.env;
    const lane = this.lanes[i];
    const v = traffic.add('semi', pal.white, this.load(lane), 'carrier');
    v.mats[5] = pal.white;
    LOADS.set(v, SLOTS.slice(0, n).map((slot) => ({ slot, paint: this.paint(), l: slot.l })));
    lane.carrier = v;
    lane.sent = n;
  }

  /** Send a new car from behind the factory to the ramp of `lane`'s carrier. */
  private send(lane: Lane) {
    const { pal } = this.env;
    const foot = lane.stop - 1.6 + RAMP_FOOT;
    const path = P([CAR_START, [CAR_X, CAR_START[1]], [CAR_X, lane.y], [foot, lane.y]], [3, 3]);
    const car: Car = { path, s: 0, pose: { x: CAR_START[0], y: CAR_START[1], hx: 1, hy: 0 }, paint: this.paint(), lane, item: null! };
    car.item = {
      x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 1.65,
      draw: (r: R) => {
        const p = car.pose;
        drawMesh(r, MESH.suv, p.x, p.y, 0, p.hx, p.hy, [car.paint, pal.carGlass, pal.tyre, pal.headlight, pal.taillight, car.paint, pal.robot, pal.robotHead]);
      },
    };
    lane.sent++;
    this.cars.push(car);
    return car;
  }

  update(dt: number) {
    const { traffic, rng } = this.env;
    // cars on their way: at 4.5 m/s, easing to a stop at the ramp, where they drive on board
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i];
      const left = c.path.len - c.s;
      c.s = Math.min(c.path.len, c.s + Math.min(4.5, Math.sqrt(2 * 2.4 * left) + 0.4) * dt);
      c.path.at(c.s, c.pose);
      if (c.s < c.path.len) continue;
      const v = c.lane.carrier!;
      const deck = LOADS.get(v)!;
      deck.push({ slot: SLOTS[deck.length], paint: c.paint, l: RAMP_FOOT });
      this.cars.splice(i, 1);
      this.yard.free(c);
    }
    // cars on board drive up the ramp to their places at 2 m/s
    for (const lane of this.lanes) {
      if (!lane.carrier) continue;
      const deck = LOADS.get(lane.carrier)!;
      for (const d of deck) d.l = Math.min(d.slot.l, d.l + 2 * dt);
      lane.full = deck.length === SLOTS.length && deck.every((d: DeckCar) => d.l >= d.slot.l);
    }
    // the next car, to a carrier standing in its lane with room on board, once the last one is up the ramp
    this.carTimer -= dt;
    if (this.carTimer <= 0 && this.cars.length === 0) {
      const ready = this.lanes.filter((l) => {
        const v = l.carrier;
        if (!v || l.sent >= SLOTS.length || !v.leg || v.leg.dwell === undefined || Math.hypot(v.x - l.stop, v.y - l.y) > 0.2) return false;
        return LOADS.get(v)!.every((d) => d.l >= Math.min(d.slot.l, RAMP_FOOT + 6));
      });
      // the fuller carrier first, so one leaves sooner
      if (ready.length && !this.yard.owner) {
        this.yard.take(this.send(ready.reduce((a, b) => (b.sent > a.sent ? b : a))));
        this.carTimer = rr(rng, 1.5, 4);
      }
    }
    // a new carrier for an empty lane, now and then
    this.timer -= dt;
    if (this.timer > 0) return;
    // not while a full one waits to leave, which a newcomer would hold up
    const empty = this.lanes.filter((l) => !l.carrier);
    if (empty.length && !this.lanes.some((l) => l.full) && traffic.clear(ROAD_X, -120, 18)) {
      this.spawn(empty[0]);
      this.timer = rr(rng, 8, 20);
    } else this.timer = 2;
  }

  items(out: Item[]) {
    for (const c of this.cars) {
      const p = c.pose;
      const ex = Math.abs(p.hx) * 2.43 + Math.abs(p.hy) * 1.0, ey = Math.abs(p.hy) * 2.43 + Math.abs(p.hx) * 1.0;
      Object.assign(c.item, { x0: p.x - ex, x1: p.x + ex, y0: p.y - ey, y1: p.y + ey });
      out.push(c.item);
    }
  }

  shadows(ctx: Ctx) {
    for (const c of this.cars) rectShadow(ctx, c.pose.x, c.pose.y, c.pose.hx, c.pose.hy, 2.3, 0.95, 1.25);
  }

  /** The yard's paving: the service road from the north, and the way out from behind the factory. */
  ground(ctx: Ctx) {
    const pal = this.env.pal;
    ctx.fillStyle = pal.pad;
    ctx.beginPath();
    for (const x of [ROAD_X, EXIT_X]) groundRect(ctx, x - 2.6, -130, x + 2.6, -39);
    groundRect(ctx, 10, -5.2, 31, -0.8);
    // where the trailers cut the corners, onto the lawn north of the yard
    groundPoly(ctx, [ROAD_X + 2.6, -40, ROAD_X + 2.6, -46.5, 40, -46, 46, -43.4, 52, -41.6, 54, -42.4, 56, -45, 57.3, -50, 58.3, -55, 58.3, -62, EXIT_X - 2.6, -74, EXIT_X - 2.6, -40]);
    ctx.fill();
    // a zebra where the north belt's path crosses each road
    ctx.fillStyle = pal.plaza;
    ctx.beginPath();
    for (const x0 of [ROAD_X, EXIT_X]) for (let x = x0 - 2.2; x < x0 + 2.2; x += 0.9) groundRect(ctx, x, BELT_Y - 1.1, x + 0.45, BELT_Y + 1.1);
    ctx.fill();
  }
}
