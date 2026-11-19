// What every scripted scene shares: the Activity interface, the environment it acts in, and a one-at-a-time lock.

import type { Rng } from '../core';
import type { Ctx } from '../draw';
import type { Palette } from '../palette';
import type { Item } from '../sort';
import type { Static } from '../statics';
import type { Traffic } from '../traffic/traffic';
import type { Crowd } from '../people/crowd';

export interface Activity {
  update(dt: number): void;
  items?(out: Item[]): void;
  shadows?(ctx: Ctx): void;
}

export interface Env {
  pal: Palette;
  rng: Rng;
  traffic: Traffic;
  crowd: Crowd;
  statics: Static[];
}

/** Something only one vehicle may use at a time (a lot's aisle, the yard). */
export class Mutex {
  owner: object | null = null;
  take(who: object) {
    if (this.owner && this.owner !== who) return false;
    this.owner = who;
    return true;
  }
  free(who: object) {
    if (this.owner === who) this.owner = null;
  }
}
