// Zones: stretches of road (a junction, a crosswalk, a driveway) that a vehicle or a person must reserve before
// entering. Who may share a zone at once is up to its compatibility rule.

import type { Leg } from './legs';
import type { Vehicle } from './vehicle';

export type Compat = (a: string, b: string) => boolean;

export class Zone {
  readonly holders = new Map<object, string>();
  /** Waiting list, first come first served: nobody may jump ahead of an earlier waiter it conflicts with. */
  private queue: { who: object; key: string; seen: number }[] = [];
  /** Advanced by the traffic tick; waiters that stop asking for half a second drop out of the queue. */
  clock = 0;
  /**
   * A key that waits for a gap: it may only enter when nobody else is inside or waiting, and nobody waits for it.
   * Crosswalks use 'ped', so people gather at the kerb and cross between cars.
   */
  yieldKey: string | null = null;
  /** With `false`, the yielding key only waits for others to clear out, not for those still queueing. */
  yieldToQueue = true;
  /**
   * Optional invisible signal: approach letters allowed in each phase (e.g. ["NS", "EW"]). Phases switch when the
   * other side is waiting and the current one has had its minimum green, with a short clearance in between.
   */
  phases: string[] | null = null;
  /** Optional per-vehicle key (e.g. to keep semis apart from everything else); defaults to 'car'. */
  keyOf: ((v: Vehicle, leg: Leg) => string) | null = null;
  phase = 0;
  private phaseT = 0;
  private clearing = 0;
  constructor(readonly x0: number, readonly y0: number, readonly x1: number, readonly y1: number, readonly compat: Compat) {}
  /** Advance the signal, if any. */
  tick(dt: number) {
    this.clock += dt;
    if (!this.phases) return;
    if (this.clearing > 0) {
      this.clearing -= dt;
      if (this.clearing <= 0) {
        this.phase = (this.phase + 1) % this.phases.length;
        this.phaseT = 0;
      }
      return;
    }
    this.phaseT += dt;
    const here = this.phases[this.phase];
    let mine = 0, others = 0;
    for (const q of this.queue) {
      if (this.clock - q.seen > 0.5) continue;
      if (here.includes(q.key[0])) mine++;
      else others++;
    }
    const minGreen = 3, maxGreen = this.phase === 0 ? 11 : 8;
    if (others > 0 && (this.phaseT > maxGreen || (this.phaseT > minGreen && mine === 0))) this.clearing = 1.2;
  }

  /** Join or refresh the queue; true if `who` could enter now. */
  ask(who: object, key: string): boolean {
    if (this.holders.has(who)) return true;
    let me: { who: object; key: string; seen: number } | undefined;
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i];
      if (this.clock - q.seen > 0.5) this.queue.splice(i, 1);
      else if (q.who === who) me = q;
    }
    if (!me) this.queue.push((me = { who, key, seen: this.clock }));
    else {
      me.seen = this.clock;
      me.key = key;
    }
    for (const [, k] of this.holders) if (!this.compat(k, key)) return false;
    if (this.phases) {
      if (this.clearing > 0) return false;
      const here = this.phases[this.phase];
      if (!here.includes(key[0])) return false;
      for (const q of this.queue) {
        if (q === me) break;
        if (here.includes(q.key[0]) && !this.compat(q.key, key)) return false;
      }
      return true;
    }
    if (this.yieldKey !== null) {
      if (key === this.yieldKey) {
        if (this.yieldToQueue) for (const q of this.queue) if (!this.compat(q.key, key)) return false;
        return true;
      }
      for (const q of this.queue) {
        if (q === me) break;
        if (q.key !== this.yieldKey && !this.compat(q.key, key)) return false;
      }
      return true;
    }
    for (const q of this.queue) {
      if (q === me) break;
      if (!this.compat(q.key, key)) return false;
    }
    return true;
  }
  /** Whether `who` could enter now if it joined the back of the queue; unlike `ask`, it doesn't join it. */
  wouldGrant(who: object, key: string): boolean {
    if (this.holders.has(who)) return true;
    for (const [, k] of this.holders) if (!this.compat(k, key)) return false;
    const waiting = this.queue.filter((q) => q.who !== who && this.clock - q.seen <= 0.5);
    if (this.phases) {
      const here = this.phases[this.phase];
      if (this.clearing > 0 || !here.includes(key[0])) return false;
      return !waiting.some((q) => here.includes(q.key[0]) && !this.compat(q.key, key));
    }
    if (this.yieldKey !== null && key === this.yieldKey) return !this.yieldToQueue || !waiting.some((q) => !this.compat(q.key, key));
    return !waiting.some((q) => q.key !== this.yieldKey && !this.compat(q.key, key));
  }
  enter(who: object, key: string) {
    this.holders.set(who, key);
    this.dequeue(who);
  }
  tryEnter(who: object, key: string): boolean {
    if (!this.ask(who, key)) return false;
    this.enter(who, key);
    return true;
  }
  leave(who: object) {
    this.holders.delete(who);
    this.dequeue(who);
  }
  private dequeue(who: object) {
    const i = this.queue.findIndex((q) => q.who === who);
    if (i >= 0) this.queue.splice(i, 1);
  }
  has(who: object) {
    return this.holders.has(who);
  }
  contains(x: number, y: number, m = 0) {
    return x >= this.x0 - m && x <= this.x1 + m && y >= this.y0 - m && y <= this.y1 + m;
  }
  /** Whether a body's footprint (the box around its turned outline), grown by `m`, overlaps the zone. */
  touches(b: { x: number; y: number; hx: number; hy: number; hl: number; hw: number }, m = 0) {
    const ex = Math.abs(b.hx) * b.hl + Math.abs(b.hy) * b.hw + m, ey = Math.abs(b.hy) * b.hl + Math.abs(b.hx) * b.hw + m;
    return b.x + ex >= this.x0 && b.x - ex <= this.x1 && b.y + ey >= this.y0 && b.y - ey <= this.y1;
  }
}

/** Crosswalks: cars share with cars, people with people. */
export const sameKind: Compat = (a, b) => a === b;

const OPP: Record<string, string> = { N: 'S', S: 'N', E: 'W', W: 'E' };
/** Junction keys are "<approach><turn>": approach N/S/E/W, turn S(traight), R (near side) or L (across traffic). */
export const junction: Compat = (a, b) => {
  if (a[0] === b[0]) return true;
  if (OPP[a[0]] === b[0]) return a[1] !== 'L' && b[1] !== 'L';
  return false;
};

export function compass(hx: number, hy: number) {
  return Math.abs(hx) > Math.abs(hy) ? (hx > 0 ? 'E' : 'W') : hy > 0 ? 'S' : 'N';
}
