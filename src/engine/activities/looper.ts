// Loops: a walker that repeats a list of steps forever (dock workers, a battery-yard inspector, site workers).

import { Walker } from '../people/walker';
import type { Activity, Env } from './activity';

export class Looper implements Activity {
  readonly w: Walker;
  constructor(env: Env, kind: 'person' | 'robot', private steps: () => Parameters<Walker['go']>[0], x: number, y: number, z = 0) {
    this.w = new Walker(kind, env.pal, env.rng, x, y);
    this.w.z = z;
    env.crowd.add(this.w);
  }
  update() {
    if (!this.w.steps.length && this.w.waitT <= 0) this.w.go(this.steps());
  }
}
