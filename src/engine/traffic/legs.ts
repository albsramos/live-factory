// Legs: the stretches of a vehicle's trip. Each is a path plus what to do on it (wait, dwell, reverse), and the
// zones along it, reserved a group at a time.

import type { Path, Pose } from '../path';
import { type Zone, junction, compass } from './zone';
import type { Vehicle } from './vehicle';
import { roomOn, semiOn } from './sense';

export interface Req {
  zone: Zone;
  key: string;
  sIn: number;
  sOut: number;
  held: boolean;
  done: boolean;
}

/** Zones that follow each other closely (a crosswalk right before a junction) are reserved together. */
export type Group = Req[];

export interface Leg {
  path: Path;
  /** A label zones can read through `keyOf`, e.g. to tell a car park's arrivals from its departures. */
  tag?: string;
  /** Drive backwards along the path. */
  rev?: boolean;
  vmax: number;
  /** Seconds to wait at the end of this leg. */
  dwell?: number;
  /** Hold at the end of this leg until this returns true. */
  until?: (v: Vehicle) => boolean;
  /** Called once when the leg is finished. */
  done?: (v: Vehicle) => void;
  /** Called once when the vehicle stops at the end of the leg (before dwelling). */
  arrive?: (v: Vehicle) => void;
  /** Don't brake for other vehicles on this leg (scripted yard moves). */
  ghost?: boolean;
  /**
   * Reserve zones this far apart together, instead of 3.5 m (a car) or a truck length (a semi): for a semi that must
   * not stop in a junction waiting for a crossing beyond it (docs/simulation.md).
   */
  groupGap?: number;
  /**
   * For a semi reversing: the trailer's heading (radians) at each distance along this leg. Backing a trailer is
   * unstable to simulate, so a reverse leg replays a forward run backwards (see `backingTrack`).
   */
  trailerAngle?: (s: number) => number;
}

export interface LegState extends Leg {
  reqs: Req[];
  groups: Group[];
  limits: { s0: number; s1: number; v: number }[];
}

export interface Body {
  x: number;
  y: number;
  hx: number;
  hy: number;
  hl: number;
  hw: number;
}

export const ACC = 2.6;
export const DEC = 4.2;
const LAT = 2.2; // lateral acceleration used to slow down for curves

/** Work out a leg's zone reservations (grouped, see docs/simulation.md) and its speed limits in curves. */
export function prepareLeg(v: Vehicle, l: Leg): LegState {
  const reqs: Req[] = [];
  for (const z of v.traffic.zones) {
    for (const [a, b] of l.path.spans(z.x0, z.y0, z.x1, z.y1)) {
      const p0 = l.path.at(Math.min(l.path.len, a + 0.5), { x: 0, y: 0, hx: 1, hy: 0 });
      const p1 = l.path.at(Math.max(0, b - 0.5), { x: 0, y: 0, hx: 1, hy: 0 });
      let key = z.keyOf ? z.keyOf(v, l) : 'car';
      if (z.compat === junction) {
        const cr = p0.hx * p1.hy - p0.hy * p1.hx;
        const dot = p0.hx * p1.hx + p0.hy * p1.hy;
        const turn = dot > 0.85 ? 'S' : cr > 0 ? 'R' : 'L';
        key = compass(p0.hx, p0.hy) + turn;
      }
      reqs.push({ zone: z, key, sIn: a, sOut: b, held: false, done: false });
    }
  }
  reqs.sort((a, b) => a.sIn - b.sIn);
  const groups: Group[] = [];
  // a semi never waits with its trailer across a lane: it reserves everything within a truck length together
  const gapLimit = l.groupGap ?? (v.kind === 'semi' ? Math.max(3.5, v.tail + v.hl) : 3.5);
  for (const q of reqs) {
    const g = groups[groups.length - 1];
    if (g && q.sIn - Math.max(...g.map((x) => x.sOut)) < gapLimit) g.push(q);
    else groups.push([q]);
  }
  const limits: { s0: number; s1: number; v: number }[] = [];
  l.path.segs.forEach((g, i) => {
    if (g.k === 1) limits.push({ s0: l.path.cum[i], s1: l.path.cum[i] + g.len, v: Math.max(1.4, Math.sqrt(g.r * LAT)) });
  });
  return { ...l, reqs, groups, limits };
}

/**
 * Reserve the zones coming up on this leg, a group at a time, and return how far the vehicle may go: up to the
 * first group it can't have yet, or `dStop`.
 */
export function reserveZones(v: Vehicle, leg: LegState, dStop: number): number {
  const front = v.s + v.hl;
  const reach = 10 + (v.v * v.v) / (2 * DEC);
  for (const g of leg.groups) {
    let pending = false;
    for (const q of g) if (!q.held && !q.done) pending = true;
    const sIn = g[0].sIn;
    const boxed = v.kind !== 'semi' && g.some((q) => q.zone.compat === junction);
    if (!pending) {
      // until its nose is in, a car that has the junction backs off if the road past it has filled up since, as
      // long as it can still stop comfortably
      const room = sIn - front - 0.4;
      if (boxed && front < sIn && (v.v * v.v) / (2 * DEC) < room && !g.some((q) => q.done) && !roomPast(v, leg, g)) {
        for (const q of g) {
          q.zone.leave(v);
          q.held = false;
          v.held.delete(q.zone);
        }
        return Math.min(dStop, room);
      }
      continue;
    }
    if (sIn - front >= reach) break;
    // only the front vehicle of a queue reserves what lies ahead; one stuck behind another waits its turn
    if (v.lastGap < sIn - front - 0.5) break;
    // don't block the junction: a car goes in only when there's room for all of it past the far side, or a queue
    // backing up through it can lock it against the movement that would clear that queue (a semi pulling out)
    let ok = !boxed || roomPast(v, leg, g);
    if (ok) for (const q of g) if (!q.held && !q.done && !q.zone.ask(v, q.key)) ok = false;
    if (!ok) {
      dStop = Math.min(dStop, sIn - front - 0.4);
      break;
    }
    for (const q of g) {
      if (q.held || q.done) continue;
      q.zone.enter(v, q.key);
      q.held = true;
      v.held.add(q.zone);
    }
  }
  return dStop;
}

/** Nothing stands on the road just past the group, where the whole vehicle has to fit once it's through. */
function roomPast(v: Vehicle, leg: LegState, g: Group): boolean {
  const sOut = Math.max(...g.map((q) => q.sOut));
  // the probe finds a body from a little before its end, so look a car length and a gap and a half past the exit;
  // and further for a semi, which can stand across the road ahead for a long while (the bay truck turning out
  // through the bend while westbound cars queue back from it into the junction)
  return roomOn(v, leg.path, sOut, sOut + v.tail + v.hl + 3.5) && (v.kind === 'semi' || !semiOn(v, leg.path, sOut, sOut + 25));
}

/** Let go of every zone the vehicle has fully left (no part of its footprint in it, nothing more to cross). */
export function releaseZones(v: Vehicle, leg: LegState) {
  for (const z of v.held) {
    let inside = false;
    // held until nothing of us is in it any more (a trailer's whole length, not just its centre)
    for (const b of v.bodies) if (z.touches(b, 0.3)) inside = true;
    const pending = leg.reqs.some((q) => q.zone === z && !q.done && q.sOut > v.s - v.tail);
    if (!inside && !pending) {
      z.leave(v);
      v.held.delete(z);
      for (const q of leg.reqs) if (q.zone === z) q.done = true;
    }
  }
}

/**
 * Backing a semi into a dock. `out` is the forward pull-out from the dock; the returned leg drives the same
 * curve in reverse (`path` must be `out` run backwards, which a symmetric fillet path is). The trailer heading is
 * recorded from a forward simulation of `out` and played back, which is physically exact because the trailer's
 * no-slip constraint doesn't care which way time runs. `startAngle` is the trailer heading the truck arrives with;
 * any difference is blended out over the first eight metres.
 */
export function backingTrack(out: Path, startAngle: number): (s: number) => number {
  const ds = 0.05;
  const n = Math.ceil(out.len / ds) + 1;
  const track = new Float32Array(n);
  const p: Pose = { x: 0, y: 0, hx: 1, hy: 0 };
  out.at(0, p);
  let kx = p.x - p.hx * 1.6, ky = p.y - p.hy * 1.6;
  let ax = kx - p.hx * 9.6, ay = ky - p.hy * 9.6;
  for (let i = 0; i < n; i++) {
    out.at(i * ds, p);
    kx = p.x - p.hx * 1.6;
    ky = p.y - p.hy * 1.6;
    let dx = kx - ax, dy = ky - ay;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    ax = kx - dx * 9.6;
    ay = ky - dy * 9.6;
    track[i] = Math.atan2(dy, dx);
  }
  const L = out.len;
  const end = track[n - 1];
  let off = startAngle - end;
  while (off > Math.PI) off -= Math.PI * 2;
  while (off < -Math.PI) off += Math.PI * 2;
  return (sRev: number) => {
    const sf = Math.max(0, Math.min(L, L - sRev));
    const a = track[Math.min(n - 1, Math.round(sf / ds))];
    return a + off * Math.max(0, 1 - sRev / 8);
  };
}
