// Every so often a roadster comes along the avenue and hops: it lifts off on its thrusters, flies on over the
// traffic with a roll, and sets down again where the lane is clear (traffic/hop.ts). One every 30-45 s, one at a
// time, alternating directions. It has its own random stream, so the rest of the scene plays out as it always did
// until it arrives.

import { type Rng, rr } from '../core';
import { Path } from '../path';
import { Hop } from '../traffic/hop';
import { Puffs } from '../traffic/exhaust';
import type { Item } from '../sort';
import type { Vehicle } from '../traffic/vehicle';
import type { Activity, Env } from './activity';

// Distances along each lane, from its start: the avenue's southbound lane starts at y −52, the northbound at y 112.
const LANES = [
  // southbound: lifts off before the yard's exit and flies over it, the crossing and the junction; sets down
  // before the crossing by the robotaxi stop, or past it
  { path: Path.poly([[70, -52], [70, 112]], []), takeoff: [44, 64] as [number, number], land: [94, 150] as [number, number] },
  // northbound: lifts off beside the robotaxi stop and flies over the junction and the crossing north of it
  { path: Path.poly([[74, 112], [74, -52]], []), takeoff: [42, 54] as [number, number], land: [82, 134] as [number, number] },
];

export class Roadsters implements Activity {
  private readonly puffs: Puffs;
  /** the scene runs 40 s before its first frame: the first one sets off as it opens, and hops in the opening seconds */
  private wait = 40;
  private lane = 1;
  private car: Vehicle | null = null;

  constructor(private readonly env: Env, private readonly rng: Rng) {
    this.puffs = new Puffs(env.pal);
  }

  update(dt: number) {
    this.puffs.update(dt);
    // counted from one setting off to the next; a trip takes about 20 s, so they never overlap
    this.wait -= dt;
    if (this.car && !this.car.dead) return;
    this.car = null;
    if (this.wait > 0) return;
    const { traffic, pal } = this.env;
    const ln = LANES[this.lane];
    const start = ln.path.at(0, { x: 0, y: 0, hx: 1, hy: 0 });
    if (!traffic.clear(start.x, start.y, 9)) return;
    const v = traffic.add('roadster', pal.paints[0], [{ path: ln.path, vmax: rr(this.rng, 8.4, 9) }], 'roadster');
    v.mats[1] = pal.tintGlass;
    v.hop = new Hop(ln.takeoff, ln.land, this.rng, this.puffs.emit);
    this.car = v;
    this.lane = 1 - this.lane;
    this.wait = rr(this.rng, 30, 45);
  }

  items(out: Item[]) {
    this.puffs.items(out);
  }

}
