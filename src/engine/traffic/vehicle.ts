// A vehicle driving its legs: speed control for curves, stops and whatever is ahead, zone reservations, the semi's
// trailer, doors and lights. See docs/simulation.md for the rules that keep traffic flowing.

import type { Mat } from '../core';
import type { MatSlot } from '../mesh';
import type { Ctx } from '../draw';
import { rectShadow } from '../ground';
import type { Palette } from '../palette';
import type { Pose } from '../path';
import type { Item } from '../sort';
import type { Zone } from './zone';
import { type VehicleKind, DIMS } from './meshes';
import { type Leg, type LegState, type Body, ACC, DEC, prepareLeg, reserveZones, releaseZones } from './legs';
import { behindHold, inCycle, senseAhead } from './sense';
import { VehicleItem } from './vehicleItem';
import type { Traffic } from './traffic';

let VID = 1;

export class Vehicle {
  readonly id = VID++;
  x = 0;
  y = 0;
  hx = 1;
  hy = 0;
  v = 0;
  s = 0;
  li = 0;
  legs: LegState[] = [];
  dead = false;
  hl: number;
  hw: number;
  h: number;
  /** distance from the reference point back to the tail along the path (trailers make this long) */
  tail: number;
  bodies: Body[] = [];
  mats: MatSlot[];
  /** 0..1 — door animation for pods and vans, rear doors for trailers */
  door = 0;
  doorTarget = 0;
  /** trailer cargo fill 0..1 */
  cargo = 0;
  /** forklift fork height and load */
  fork = 0.15;
  load = false;
  /** charging indicator */
  charging = false;
  /** stay put when the plan runs out instead of leaving the scene (yard vehicles) */
  keep = false;
  /** slowing down or standing: the tail lights burn brighter */
  braking = false;
  private dwellT = 0;
  private arrived = false;
  private stuckT = 0;
  private ghostT = 0;
  readonly held = new Set<Zone>();
  // trailer state
  tx = 0;
  ty = 0;
  thx = 1;
  thy = 0;
  readonly items: Item[] = [];
  private readonly pose: Pose = { x: 0, y: 0, hx: 1, hy: 0 };

  constructor(readonly kind: VehicleKind, readonly pal: Palette, paint: Mat, legs: Leg[], readonly traffic: Traffic, readonly role = '') {
    const [hl, hw, h] = DIMS[kind];
    this.hl = hl;
    this.hw = hw;
    this.h = h;
    this.tail = kind === 'semi' ? 1.6 + 12.8 : hl;
    this.mats = [paint, pal.carGlass, pal.tyre, pal.headlight, pal.taillight, pal.white, pal.robot, pal.robotHead];
    this.bodies.push({ x: 0, y: 0, hx: 1, hy: 0, hl, hw });
    if (kind === 'semi') this.bodies.push({ x: 0, y: 0, hx: 1, hy: 0, hl: 6.7, hw: 1.27 });
    this.items.push(new VehicleItem(this, 0));
    if (kind === 'semi') this.items.push(new VehicleItem(this, 1));
    this.setLegs(legs);
    this.placeAt(0);
    if (kind === 'semi') {
      // start with the trailer straight behind the tractor
      const kx = this.x - this.hx * 1.6, ky = this.y - this.hy * 1.6;
      this.thx = this.hx;
      this.thy = this.hy;
      this.tx = kx - this.thx * 9.6;
      this.ty = ky - this.thy * 9.6;
    }
    this.syncBodies();
  }

  setLegs(legs: Leg[]) {
    this.legs = legs.map((l) => prepareLeg(this, l));
    this.li = 0;
    this.s = 0;
    this.dwellT = 0;
    this.arrived = false;
  }

  /** Append legs after the current plan. */
  pushLegs(legs: Leg[]) {
    for (const l of legs) this.legs.push(prepareLeg(this, l));
  }

  get leg(): LegState | undefined {
    return this.legs[this.li];
  }

  /** Lights are off while parked: charging, docked or loading (a dwell at the end of a leg), or doors open. */
  get isLit(): boolean {
    if (this.charging || this.door > 0.01) return false;
    return !(this.arrived && this.leg?.dwell !== undefined);
  }

  private placeAt(s: number) {
    const leg = this.leg;
    if (!leg) return;
    leg.path.at(s, this.pose);
    this.x = this.pose.x;
    this.y = this.pose.y;
    if (leg.rev) {
      this.hx = -this.pose.hx;
      this.hy = -this.pose.hy;
    } else {
      this.hx = this.pose.hx;
      this.hy = this.pose.hy;
    }
  }

  /** Jump forward along the current leg (used to start the scene mid-route). */
  advance(ds: number) {
    const leg = this.leg;
    if (!leg) return;
    this.s = Math.min(leg.path.len - 0.01, this.s + ds);
    this.placeAt(this.s);
    if (this.kind === 'semi') {
      const kx = this.x - this.hx * 1.6, ky = this.y - this.hy * 1.6;
      this.thx = this.hx;
      this.thy = this.hy;
      this.tx = kx - this.thx * 9.6;
      this.ty = ky - this.thy * 9.6;
    }
    this.syncBodies();
  }

  private syncBodies() {
    const b = this.bodies[0];
    b.x = this.x;
    b.y = this.y;
    b.hx = this.hx;
    b.hy = this.hy;
    if (this.kind === 'semi') {
      const t = this.bodies[1];
      // centre of the trailer box (-12.8..0.6 from the kingpin), from the rear axle at -9.6
      const kx = this.x - this.hx * 1.6, ky = this.y - this.hy * 1.6;
      t.x = kx - this.thx * 6.1;
      t.y = ky - this.thy * 6.1;
      t.hx = this.thx;
      t.hy = this.thy;
    }
  }

  update(dt: number) {
    const leg = this.leg;
    if (!leg) {
      if (!this.keep) this.die();
      return;
    }
    // door animation
    if (this.door !== this.doorTarget) {
      const sp = this.kind === 'semi' ? 0.45 : 1.6;
      this.door = this.door < this.doorTarget ? Math.min(this.doorTarget, this.door + dt * sp) : Math.max(this.doorTarget, this.door - dt * sp);
    }
    const len = leg.path.len;
    const isLast = this.li === this.legs.length - 1;
    const stopsHere = isLast || leg.dwell !== undefined || !!leg.until || !!leg.arrive || leg.rev !== this.legs[this.li + 1]?.rev;
    let dStop = stopsHere ? len - this.s : Infinity;
    dStop = reserveZones(this, leg, dStop);
    releaseZones(this, leg);
    // vehicles ahead
    let blocked = false;
    if (!leg.ghost && this.ghostT <= 0) {
      const gap = this.sense();
      if (gap < dStop + 1.4) {
        if (gap - 1.4 < 0.5) blocked = true;
        dStop = Math.min(dStop, gap - 1.4);
      }
    }
    if (this.ghostT > 0) this.ghostT -= dt;
    let vt = leg.vmax;
    for (const lim of leg.limits) {
      if (this.s > lim.s1) continue;
      const d = lim.s0 - this.s;
      vt = Math.min(vt, d <= 0 ? lim.v : Math.sqrt(lim.v * lim.v + 2 * DEC * 0.6 * d));
    }
    if (dStop < Infinity) vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * DEC * Math.max(0, dStop))));
    const v0 = this.v;
    if (vt > this.v) this.v = Math.min(vt, this.v + ACC * dt);
    else this.v = Math.max(vt, this.v - DEC * 2.2 * dt);
    this.braking = this.v < 0.1 || this.v < v0 - 1e-3;
    if (dStop <= 0.02 && dStop < len - this.s - 0.05) this.v = 0;
    // deadlock breaker: when the vehicles in front block each other in a loop that comes back to us, or as a last
    // resort after a very long stall. A plain queue (say, behind a truck at a red light) just waits.
    if (blocked && this.v < 0.05) {
      this.stuckT += dt;
      if ((this.stuckT > 6 && inCycle(this)) || (this.stuckT > 90 && !behindHold(this))) {
        this.ghostT = 2.5;
        this.stuckT = 0;
      }
    } else this.stuckT = 0;

    this.s += this.v * dt;
    if (this.s >= len - 1e-4) {
      const extra = Math.max(0, this.s - len);
      this.s = len;
      if (stopsHere) this.v = 0;
      if (!this.arrived) {
        this.arrived = true;
        leg.arrive?.(this);
      }
      let go = true;
      if (leg.dwell !== undefined) {
        this.dwellT += dt;
        if (this.dwellT < leg.dwell) go = false;
      }
      if (go && leg.until && !leg.until(this)) go = false;
      if (go) {
        leg.done?.(this);
        this.li++;
        this.dwellT = 0;
        this.arrived = false;
        if (this.li >= this.legs.length) {
          if (!this.keep) this.die();
          return;
        }
        this.s = stopsHere ? 0 : extra;
      }
    }
    this.placeAt(this.s);
    if (this.kind === 'semi') this.updateTrailer();
    this.syncBodies();
  }

  private updateTrailer() {
    const kx = this.x - this.hx * 1.6, ky = this.y - this.hy * 1.6;
    const fn = this.leg?.trailerAngle;
    if (fn) {
      const a = fn(this.s);
      this.thx = Math.cos(a);
      this.thy = Math.sin(a);
      this.tx = kx - this.thx * 9.6;
      this.ty = ky - this.thy * 9.6;
      return;
    }
    let dx = kx - this.tx, dy = ky - this.ty;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    this.thx = dx;
    this.thy = dy;
    this.tx = kx - dx * 9.6;
    this.ty = ky - dy * 9.6;
  }

  /** @internal the vehicle whose body is first on the road ahead of us */
  blocker: Vehicle | null = null;
  /** @internal distance to the first vehicle on our road ahead, as of the last frame */
  lastGap = Infinity;

  private sense(): number {
    this.lastGap = senseAhead(this);
    return this.lastGap;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    for (const z of this.held) z.leave(this);
    this.held.clear();
  }

  shadow(ctx: Ctx) {
    rectShadow(ctx, this.x, this.y, this.hx, this.hy, this.hl * 0.96, this.hw * 0.96, this.h * 0.78);
    if (this.kind === 'semi') {
      const t = this.bodies[1];
      rectShadow(ctx, t.x, t.y, t.hx, t.hy, t.hl, t.hw, 3.6);
    }
  }
}
