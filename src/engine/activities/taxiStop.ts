// Robotaxi stop: two-seat pods and the occasional van pull into the bay, open up, swap passengers and go.

import { rr } from '../core';
import { Path } from '../path';
import type { Vehicle } from '../traffic/vehicle';
import { ALOFT_Z } from '../traffic/hop';
import { Walker } from '../people/walker';
import type { Activity, Env } from './activity';

const P = Path.poly;
export class TaxiStop implements Activity {
  private timer = 2;
  private waiting: Walker[] = [];
  private current: Vehicle | null = null;
  private phase: 'none' | 'open' | 'board' | 'close' = 'none';
  private boardT = 0;
  private spots = [[82.9, 61.2], [83.1, 63.0], [82.7, 64.6]];

  constructor(private env: Env, private joinGraph: (w: Walker) => void) {
    for (let i = 0; i < 2; i++) this.addWaiting(true);
  }

  private addWaiting(instant: boolean) {
    const { pal, rng, crowd } = this.env;
    const used = new Set(this.waiting.map((w) => (w as Walker & { spot?: number }).spot));
    const spot = [0, 1, 2].find((i) => !used.has(i));
    if (spot === undefined) return;
    const [x, y] = this.spots[spot];
    // newcomers walk up the pavement from below the bottom edge, so nobody appears out of thin air
    const w = new Walker('person', pal, rng, instant ? x : 77.6, instant ? y : 88);
    (w as Walker & { spot?: number }).spot = spot;
    if (instant) w.face(-1, 0.2);
    else w.go([{ x: 77.7, y: 80 }, { x: 80.0, y: 75.4 }, { x: 81.0, y: 68 }, { x, y, face: [-1, 0.2] }]);
    crowd.add(w);
    this.waiting.push(w);
  }

  private clearToLeave(me: Vehicle) {
    for (const o of this.env.traffic.vehicles) {
      if (o === me || o.dead || o.z > ALOFT_Z) continue;
      // queued in the lane beside us, or coming up from behind
      for (const b of o.bodies) if (b.x > 71.5 && b.x < 76.5 && b.y > 50 && b.y < me.y + 28) return false;
    }
    return true;
  }

  update(dt: number) {
    const { traffic, pal, rng } = this.env;
    const v = this.current;
    if (!v) {
      this.timer -= dt;
      if (this.timer <= 0 && traffic.clear(74, 112, 10)) {
        this.timer = rr(rng, 12, 20);
        const van = rng() < 0.3;
        this.current = traffic.add(van ? 'van' : 'pod', pal.gold, [
          {
            path: P([[74, 112], [74, 78], [77.5, 72.5], [77.5, van ? 64.5 : 63.4]], [4, 4]),
            vmax: 6.5,
            arrive: (vv) => {
              vv.doorTarget = 1;
              this.phase = 'open';
            },
            until: () => this.phase === 'none',
          },
          { path: P([[77.5, van ? 64.5 : 63.4], [77.5, 60], [74, 55.5], [74, -52]], [4, 4]), vmax: 6.5 },
        ]);
      }
      if (this.waiting.length < 2 && rng() < dt * 0.15) this.addWaiting(false);
      return;
    }
    if (v.dead || (v.li > 0 && this.phase === 'none')) {
      this.current = null;
      return;
    }
    const door = v.kind === 'van' ? [v.x + 1.6, v.y + 0.3] : [v.x + 1.25, v.y + 0.1];
    switch (this.phase) {
      case 'open':
        if (v.door >= 1) {
          this.phase = 'board';
          this.boardT = 0;
          // someone gets out
          const out = v.kind === 'van' ? 1 + Math.floor(rng() * 2) : rng() < 0.5 ? 1 : 0;
          for (let i = 0; i < out; i++) {
            const w = new Walker('person', pal, rng, door[0], door[1] + i * 0.5);
            w.waitT = i * 0.8;
            w.go([{ x: 80.6, y: 61 + i }, { x: 80.6, y: 70 + i * 0.5 }]);
            w.onIdle = (ww) => this.joinGraph(ww);
            this.env.crowd.add(w);
          }
          // the waiting passengers walk over (only those already at the stop, not anyone still on their way)
          const ready = this.waiting.filter((w) => !w.steps.length);
          const n = v.kind === 'van' ? ready.length : Math.min(1, ready.length);
          for (let i = 0; i < n; i++) {
            const w = ready[i];
            this.waiting.splice(this.waiting.indexOf(w), 1);
            w.waitT = 0.6 + i * 0.7;
            w.go([{ x: door[0] + 0.2, y: door[1] - 0.3, then: (ww) => (ww.dead = true) }]);
          }
        }
        break;
      case 'board': {
        this.boardT += dt;
        const boarding = this.env.crowd.walkers.some((w) => !w.dead && w.steps.length && Math.hypot(w.x - door[0], w.y - door[1]) < 4.5 && w.steps[0].x === door[0] + 0.2);
        if (this.boardT > 3.2 && !boarding) {
          v.doorTarget = 0;
          this.phase = 'close';
        }
        break;
      }
      case 'close':
        // pull out only when nobody is queued in the lane alongside
        if (v.door <= 0 && this.clearToLeave(v)) this.phase = 'none';
        break;
    }
  }
}
