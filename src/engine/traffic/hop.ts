// The roadster's hop: it lifts off its lane on four thrusters under its corners, flies on along the lane over the
// traffic, rolls once, and sets down again where the lane is clear. Off the road it reserves no zones and brakes
// for nothing, and nothing brakes for it (see docs/simulation.md).

import { type Rng, rr, smooth } from '../core';
import type { Pose } from '../path';
import type { LegState } from './legs';
import type { Vehicle } from './vehicle';

/** Cruising height: well clear of a semi's trailer roof (4.1 m). */
export const HOP_ALT = 6.2;
/** The height of the axis the body rolls about. */
export const ROLL_Z = 0.6;
/** Above this a vehicle is over everything on the road: nothing brakes for it. */
export const ALOFT_Z = 1.8;
const T_LIFT = 1.2;
const T_LAND = 1.5;
const T_ROLL = 1.25;
const T_BOOST = 1.4;
const V_FLY = 12.5;

/** A puff of smoke: where, its radius at first and at the end, how long it lasts, and its drift. */
export type Emit = (x: number, y: number, z: number, r0: number, r1: number, life: number, vx: number, vy: number, vz: number) => void;

/** The thrusters, in the body's own space (l forward, w left, z up): four under the corners, two in the tail. */
export const DOWN_JETS = [[1.45, 0.78], [1.45, -0.78], [-1.45, 0.78], [-1.45, -0.78]];
export const BACK_JETS = [0.62, -0.62];
const JET_Z = 0.2;

type Phase = 'road' | 'lift' | 'fly' | 'land' | 'boost' | 'done';

const P: Pose = { x: 0, y: 0, hx: 1, hy: 0 };
const W = [0, 0, 0];

/** A point of the body in the world, with its height and roll: written to `out` as x, y, z. */
export function bodyPoint(v: Vehicle, l: number, w: number, z: number, out: number[] = W) {
  const c = Math.cos(v.roll), s = Math.sin(v.roll), zc = z - ROLL_Z;
  const w2 = w * c - zc * s;
  out[0] = v.x + l * v.hx - w2 * v.hy;
  out[1] = v.y + l * v.hy + w2 * v.hx;
  out[2] = v.z + ROLL_Z + w * s + zc * c;
  return out;
}

export class Hop {
  phase: Phase = 'road';
  private t = 0;
  private puffT = 0;
  private zFrom = HOP_ALT;
  /** speed while off the road */
  vmax = V_FLY;
  /** off the road: reserves no zones */
  aloft = false;
  /** not looking ahead: lifting off, or too high to hit anything */
  blind = false;
  /** thrust 0..1 of the jets under the corners and of those in the tail */
  down = 0;
  back = 0;

  /** `takeoff` and `land` are the stretches of the leg (distance along it) where it may lift off and set down. */
  constructor(readonly takeoff: [number, number], readonly land: [number, number], private readonly rng: Rng, private readonly emit: Emit) {}

  update(v: Vehicle, leg: LegState, dt: number) {
    this.t += dt;
    const t = this.t;
    switch (this.phase) {
      case 'road':
        // on the move with room ahead, or standing in a queue it then hops over
        if (v.s >= this.takeoff[0] && v.s <= this.takeoff[1] && ((v.v > 3 && v.lastGap > 6) || v.v < 0.3)) this.go(v, 'lift');
        break;
      case 'lift': {
        const u = Math.min(1, t / T_LIFT);
        v.z = HOP_ALT * (1 - (1 - u) ** 3);
        this.down = 1 - 0.65 * u;
        this.back = u;
        if (u >= 1) this.go(v, 'fly');
        break;
      }
      case 'fly': {
        v.z = HOP_ALT + 0.14 * Math.sin(t * 2.4);
        const u = (t - 0.35) / T_ROLL;
        v.roll = u <= 0 || u >= 1 ? 0 : Math.PI * 2 * smooth(u);
        this.down = 0.35;
        this.back = 1;
        if (u >= 1 && v.s >= this.land[0] && v.s <= this.land[1] && this.clear(v, leg)) {
          this.zFrom = v.z;
          this.go(v, 'land');
        }
        break;
      }
      case 'land': {
        const u = Math.min(1, t / T_LAND);
        v.z = this.zFrom * (1 - smooth(u));
        this.vmax = V_FLY + (leg.vmax - V_FLY) * Math.min(1, u * 1.4);
        this.down = 0.45 + 0.55 * u;
        this.back = 1 - u;
        this.blind = v.z > ALOFT_Z;
        if (u >= 1) {
          v.z = 0;
          this.go(v, 'boost');
        }
        break;
      }
      case 'boost':
        this.down = 0;
        this.back = 0.8 * Math.max(0, 1 - t / T_BOOST);
        if (t >= T_BOOST) this.go(v, 'done');
        break;
    }
    if (this.aloft) {
      // the zones it has flown right over are behind it: it never asks for those again
      for (const q of leg.reqs) if (!q.done && q.sOut < v.s - v.hl - 0.5) q.done = true;
    }
    this.smoke(v, dt);
  }

  private go(v: Vehicle, phase: Phase) {
    this.phase = phase;
    this.t = 0;
    if (phase === 'lift') {
      this.aloft = this.blind = true;
      // let go of everything it holds or waits for: it won't be on the road there
      for (const z of v.held) z.leave(v);
      v.held.clear();
      for (const l of v.legs) for (const q of l.reqs) q.held = false;
    } else if (phase === 'boost') {
      this.aloft = this.blind = false;
    }
  }

  /**
   * Room to set down: nothing in its way down by the time it gets there (each vehicle carried on at its own speed;
   * early on only what stands tall enough to reach it, a semi, at the end anything on the lane), and the zones it
   * comes down in or reaches within its stopping room free for it. It takes those zones as it decides to land.
   */
  private clear(v: Vehicle, leg: LegState) {
    const vEnd = leg.vmax;
    const sTd = v.s + (V_FLY + vEnd) * 0.5 * T_LAND;
    if (sTd > leg.path.len - 10) return false;
    const zones = leg.reqs.filter((q) => !q.done && q.sIn < sTd + v.hl + 10);
    for (const q of zones) if (!q.zone.wouldGrant(v, q.key)) return false;
    for (const k of [0.15, 0.3, 0.45, 0.6, 0.8, 1]) {
      const tt = T_LAND * k;
      const zk = v.z * (1 - smooth(k));
      leg.path.at(v.s + (V_FLY + V_FLY + (vEnd - V_FLY) * k) * 0.5 * tt, P);
      for (const o of v.traffic.vehicles) {
        if (o === v || o.z > ALOFT_Z) continue;
        for (let i = 0; i < o.bodies.length; i++) {
          if ((i === 1 ? 4.1 : o.h) + 0.4 < zk) continue;
          const b = o.bodies[i];
          const dx = P.x - (b.x + o.hx * o.v * tt), dy = P.y - (b.y + o.hy * o.v * tt);
          if (Math.abs(dx * b.hx + dy * b.hy) < b.hl + v.hl + 2.5 && Math.abs(-dx * b.hy + dy * b.hx) < b.hw + v.hw + 0.4) return false;
        }
      }
    }
    for (const q of zones) {
      q.zone.enter(v, q.key);
      q.held = true;
      v.held.add(q.zone);
    }
    return true;
  }

  /** Smoke where the jets blast the road, a trail from the tail while flying, and a short streak as it speeds off. */
  private smoke(v: Vehicle, dt: number) {
    const rng = this.rng;
    this.puffT -= dt;
    if (this.puffT > 0) return;
    this.puffT = 0.03;
    const near = this.down * Math.max(0, 1 - v.z / 4.5);
    if (near > 0.05) {
      for (const [l, w] of DOWN_JETS) {
        if (rng() > near * 0.7) continue;
        const p = bodyPoint(v, l, w, JET_Z);
        let dx = p[0] - v.x, dy = p[1] - v.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = rr(rng, 1.6, 3.4);
        dx = (dx / d) * sp + rr(rng, -0.6, 0.6);
        dy = (dy / d) * sp + rr(rng, -0.6, 0.6);
        this.emit(p[0], p[1], 0.1, 0.35, rr(rng, 1.1, 1.9), rr(rng, 1.6, 2.6), dx, dy, 0.3);
      }
    }
    if (this.aloft && this.back > 0.5) {
      for (const w of BACK_JETS) {
        const p = bodyPoint(v, -2.4, w, 0.42);
        this.emit(p[0], p[1], p[2] - 0.25, 0.2, rr(rng, 0.75, 1.0), rr(rng, 1.0, 1.4), 0, 0, 0.15);
      }
    } else if (this.phase === 'boost' && this.back > 0.15) {
      const p = bodyPoint(v, -2.5, 0, 0.3);
      this.emit(p[0], p[1], 0.05, 0.3, 0.55, 0.55 * this.back, -v.hx, -v.hy, 0);
    }
  }
}
