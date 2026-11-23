// Sensing the road ahead: what a vehicle brakes for, and the checks its deadlock breaker uses.

import type { Path, Pose } from '../path';
import type { Body } from './legs';
import type { Vehicle } from './vehicle';
import { ALOFT_Z } from './hop';

const PROBE: Pose = { x: 0, y: 0, hx: 1, hy: 0 };

/** The queue in front of us ends at a vehicle that is waiting on purpose (loading, charging, at a stop). */
export function behindHold(v: Vehicle): boolean {
  let b = v.blocker;
  for (let i = 0; i < 12 && b; i++) {
    const l = b.leg;
    if (b.keep || (l && (l.until || l.dwell !== undefined))) return true;
    b = b.blocker;
  }
  return false;
}

/** The vehicles in front block each other in a loop that comes back to this one. */
export function inCycle(v: Vehicle): boolean {
  let b = v.blocker;
  for (let i = 0; i < 8 && b; i++) {
    if (b === v) return true;
    if (b.v > 0.05) return false;
    b = b.blocker;
  }
  return false;
}

/**
 * Distance from the vehicle's front to the first vehicle that sits on the road it is about to drive, found by
 * walking its own path ahead (into following legs it flows into) and testing each point against the other bodies.
 * Sets `v.blocker` to that vehicle.
 */
export function senseAhead(v: Vehicle): number {
  v.blocker = null;
  const look = 16;
  const step = 0.7;
  const m = v.hw + 0.15;
  // candidates near enough to matter
  const near: Body[] = [];
  const owners: Vehicle[] = [];
  const rev = v.legs[v.li]?.rev;
  const mx = rev ? -v.hx : v.hx, my = rev ? -v.hy : v.hy;
  for (const o of v.traffic.vehicles) {
    // nothing brakes for the roadster flying over it
    if (o === v || o.dead || o.z > ALOFT_Z) continue;
    for (const b of o.bodies) {
      if (Math.abs(b.x - v.x) > look + v.hl + b.hl + 2 || Math.abs(b.y - v.y) > look + v.hl + b.hl + 2) continue;
      // whatever is behind our centre is not in our way
      // (and two that ended up overlapping each ignore the other, so they can separate)
      if ((b.x - v.x) * mx + (b.y - v.y) * my <= 0.05) continue;
      near.push(b);
      owners.push(o);
    }
  }
  if (!near.length) return Infinity;
  let li = v.li, base = v.s + v.hl;
  let leg = v.legs[li];
  const p = PROBE;
  for (let d = 0; d <= look; d += step) {
    let sp = base + d;
    while (leg && sp > leg.path.len) {
      const next = v.legs[li + 1];
      const flows = next && !leg.dwell && !leg.until && !leg.arrive && next.rev === leg.rev;
      if (!flows) {
        sp = leg.path.len;
        break;
      }
      sp -= leg.path.len;
      base -= leg.path.len;
      li++;
      leg = next;
    }
    if (!leg) break;
    leg.path.at(sp, p);
    for (let i = 0; i < near.length; i++) {
      const b = near[i];
      const dx = p.x - b.x, dy = p.y - b.y;
      const a = dx * b.hx + dy * b.hy, c = -dx * b.hy + dy * b.hx;
      if (Math.abs(a) < b.hl + m && Math.abs(c) < b.hw + m) {
        v.blocker = owners[i];
        return d;
      }
    }
  }
  return Infinity;
}

/**
 * Whether the stretch of `path` from `s0` to `s1` is free of vehicles standing or crawling on it: a car checks the
 * road past a junction before it goes in, so it never stops inside one (see `reserveZones`).
 */
/**
 * Whether any part of a semi (cab or trailer) lies on `path` between `s0` and `s1`, moving or not. A semi turning
 * across the road past a junction holds it up for far longer than a car, so a car shouldn't enter the junction
 * behind one: it would end up standing in it.
 */
export function semiOn(v: Vehicle, path: Path, s0: number, s1: number): boolean {
  const m = v.hw + 0.15;
  const near: Body[] = [];
  for (const o of v.traffic.vehicles) if (o !== v && !o.dead && o.kind === 'semi' && o.z <= ALOFT_Z) near.push(...o.bodies);
  if (!near.length) return false;
  for (let s = s0; s <= Math.min(s1, path.len); s += 0.7) {
    path.at(s, PROBE);
    for (const b of near) {
      const dx = PROBE.x - b.x, dy = PROBE.y - b.y;
      const a = dx * b.hx + dy * b.hy, c = -dx * b.hy + dy * b.hx;
      if (Math.abs(a) < b.hl + m && Math.abs(c) < b.hw + m) return true;
    }
  }
  return false;
}

export function roomOn(v: Vehicle, path: Path, s0: number, s1: number): boolean {
  const m = v.hw + 0.15;
  const near: Body[] = [];
  path.at(Math.min(path.len, (s0 + s1) / 2), PROBE);
  const cx = PROBE.x, cy = PROBE.y, reach = (s1 - s0) / 2 + 4;
  for (const o of v.traffic.vehicles) {
    // one driving on with open road ahead will be out of the way by the time we get there
    if (o === v || o.dead || o.z > ALOFT_Z || (o.v > 1.5 && !o.braking && o.lastGap > 8)) continue;
    for (const b of o.bodies) if (Math.abs(b.x - cx) < reach + b.hl + 2 && Math.abs(b.y - cy) < reach + b.hl + 2) near.push(b);
  }
  if (!near.length) return true;
  for (let s = s0; s <= Math.min(s1, path.len); s += 0.7) {
    path.at(s, PROBE);
    for (const b of near) {
      const dx = PROBE.x - b.x, dy = PROBE.y - b.y;
      const a = dx * b.hx + dy * b.hy, c = -dx * b.hy + dy * b.hx;
      if (Math.abs(a) < b.hl + m && Math.abs(c) < b.hw + m) return false;
    }
  }
  return true;
}
