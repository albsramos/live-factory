// Truck loading bay (left of the factory road): a semi pulls in, opens up, a forklift and two robots fill it, it
// closes and drives off across the scene; a while later the next one arrives.

import { clamp, rr } from '../core';
import { box } from '../draw';
import { boxShadow } from '../ground';
import { drawMesh } from '../mesh';
import { Path } from '../path';
import { FnItem } from '../statics';
import { MESH } from '../traffic/meshes';
import type { Vehicle } from '../traffic/vehicle';
import { Walker } from '../people/walker';
import type { Activity, Env } from './activity';

const P = Path.poly;
export class TruckBay implements Activity {
  private state: 'empty' | 'arriving' | 'opening' | 'loading' | 'closing' | 'leaving' = 'empty';
  private timer = 2;
  private truck: Vehicle | null = null;
  private fork: Vehicle;
  private stack = 2;
  private restock = 0;
  private loaders: Walker[] = [];
  private shuttling = false;
  private slot = 0;
  /** where the truck parks: lane x, tractor y */
  static readonly LANE = 37;
  static readonly STOP = 77;
  /** the forklift lane beside the trailer, and its stack */
  private readonly FX = 41;
  private readonly HUB = 91.6;
  private readonly PICK = 92.85;

  constructor(private env: Env) {
    const { traffic, pal } = env;
    this.fork = traffic.add('forklift', pal.white, [{ path: P([[this.FX, 93], [this.FX, this.HUB]]), vmax: 1, ghost: true }]);
    this.fork.keep = true;
    // two robots carry boxes from a pile by the tail of the trailer into its open side
    for (let i = 0; i < 2; i++) {
      const w = new Walker('robot', pal, env.rng, 39.4 + i * 0.6, 95.2 + i * 0.5);
      w.face(-0.3, -1);
      this.loaders.push(env.crowd.add(w));
    }
    env.statics.push(
      // pallet stack the forklift draws from, and the robots' box pile
      new FnItem(40.4, 93.8, 0, 43.8, 97.6, 2.0, (r) => {
        // the pallet's shade read when drawn, so it follows the theme
        const m = [pal.crate, pal.carGlass, pal.concrete.right];
        drawMesh(r, MESH.crate, 42.9, 94.4, 0, 0, 1, m);
        drawMesh(r, MESH.crate, 42.9, 94.4, 0.95, 0, 1, m);
        drawMesh(r, MESH.crate, 42.9, 96.6, 0, 0, 1, m);
        for (let i = 0; i < this.stack; i++) drawMesh(r, MESH.crate, this.FX, 94.4, i * 0.95, 0, 1, m);
      }, (ctx) => boxShadow(ctx, 40.4, 93.8, 43.5, 97.2, 1.8)),
      new FnItem(38.2, 96.0, 0, 39.6, 97.2, 0.7, (r) => {
        box(r, 38.3, 96.1, 0, 38.9, 96.7, 0.45, pal.crate);
        box(r, 38.95, 96.2, 0, 39.5, 96.75, 0.4, pal.crate);
        box(r, 38.5, 96.15, 0.45, 39.05, 96.7, 0.85, pal.crate);
      }).still(),
    );
  }

  private spawnTruck() {
    const { traffic, pal, rng } = this.env;
    const L = TruckBay.LANE, Y = TruckBay.STOP;
    const paint = rng() < 0.75 ? pal.white : pal.paints[2];
    this.truck = traffic.add('semi', paint, [
      {
        path: P([[50, 160], [50, 130], [L, 117], [L, Y]], [6, 6]),
        vmax: 5.5,
        arrive: (v) => {
          this.state = 'opening';
          v.doorTarget = 1;
        },
        until: () => this.state === 'leaving',
      },
      // out across the plaza corner south of the zebra crossing, then round the bend a little outside the lane
      // centre, so the trailer cuts less of the inside corner, yet not so far out that cars coming the other way
      // round the bend see the cab in their path (the walkway rounds the corner clear of the trailer's sweep)
      { path: P([[L, Y], [L, 75], [49.1, 62.9], [49.1, 47.1], [62, 47.1], [66, 48], [135, 48]], [4, 6, 6.9, 3, 3]), vmax: 5.5 },
    ]);
    this.truck.mats[5] = pal.white;
    this.truck.cargo = 0;
    this.slot = 0;
    this.state = 'arriving';
  }

  /** One trip: pick a pallet, back round to face the trailer, push it in, return. */
  private cycle() {
    const f = this.fork;
    const X = this.FX;
    const ty = TruckBay.STOP + 1.6 - 0; // kingpin y
    const yk = ty - [-2.6, -5.6, -8.6, -11.6][this.slot];
    const side = TruckBay.LANE + 1.27 + 0.08 + 2.05; // forklift centre when its forks touch the trailer
    this.shuttling = true;
    f.setLegs([
      { path: P([[X, this.HUB], [X, this.PICK]]), vmax: 2.2, ghost: true, dwell: 0.5, done: (v) => {
        v.load = true;
        this.stack = Math.max(0, this.stack - 1);
        this.restock = 4;
      } },
      { path: P([[X, this.PICK], [X, yk], [X + 2.0, yk]], [2.0]), rev: true, vmax: 2.6, ghost: true },
      { path: P([[X + 2.0, yk], [side, yk]]), vmax: 2.0, ghost: true, dwell: 0.6, done: (v) => {
        v.load = false;
        if (this.truck) this.truck.cargo = Math.min(1, (this.slot + 1) / 4);
        this.slot++;
      } },
      { path: P([[side, yk], [X + 2.0, yk]]), rev: true, vmax: 2.0, ghost: true },
      { path: P([[X + 2.0, yk], [X, yk], [X, this.HUB]], [2.0]), vmax: 2.8, ghost: true, arrive: () => {
        this.shuttling = false;
      } },
    ]);
  }

  update(dt: number) {
    const f = this.fork;
    // forks rise to the trailer floor on the way in, and sit low otherwise
    const target = f.load ? (f.li === 2 ? 1.35 : 0.45) : 0.12;
    f.fork += clamp(target - f.fork, -dt * 1.1, dt * 1.1);
    if (this.restock > 0) {
      this.restock -= dt;
      if (this.restock <= 0) this.stack = 2;
    }
    const t = this.truck;
    switch (this.state) {
      case 'empty':
        this.timer -= dt;
        if (this.timer <= 0 && this.env.traffic.clear(50, 160, 16)) this.spawnTruck();
        break;
      case 'opening':
        if (t && t.door >= 1) this.state = 'loading';
        break;
      case 'loading':
        if (!t) break;
        if (this.slot >= 4 && !this.shuttling) {
          t.doorTarget = 0;
          this.state = 'closing';
          this.timer = 1.0;
        } else if (!this.shuttling && this.slot < 4) this.cycle();
        break;
      case 'closing':
        if (t && t.door <= 0) {
          this.timer -= dt;
          if (this.timer <= 0) this.state = 'leaving';
        }
        break;
      case 'leaving':
        // the next truck is only sent once this one has left the scene
        if (!t || t.dead) {
          this.truck = null;
          this.state = 'empty';
          this.timer = rr(this.env.rng, 4, 8);
        }
        break;
    }
    // robots: carry boxes into the open side near the tail while the forklift fills the front half (the rear slots
    // are where they set their boxes down), otherwise wait by their pile
    const open = this.state === 'loading' && this.slot < 2;
    this.loaders.forEach((w, i) => {
      if (w.steps.length || w.waitT > 0) return;
      const hx = 39.4 + i * 0.6, hy = 95.2 + i * 0.5;
      if (open) {
        const dy = 89.6 - i * 1.4;
        w.go([
          { x: 39.0 + i * 0.4, y: 95.6, wait: 0.6, then: (ww) => (ww.carry = true) },
          { x: 39.0, y: dy, wait: 0.5, face: [-1, 0], then: (ww) => (ww.carry = false) },
          { x: hx, y: hy },
        ]);
      } else if (Math.hypot(w.x - hx, w.y - hy) > 0.05) {
        w.carry = false;
        w.go([{ x: hx, y: hy, face: [-0.3, -1] }]);
      }
    });
  }
}
