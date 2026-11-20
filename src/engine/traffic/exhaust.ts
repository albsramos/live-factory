// The roadster's thrusters: the jets themselves, drawn with the body, and the smoke they leave, each puff its own
// small item so it sorts among the cars and the people.

import { C } from '../core';
import type { R } from '../draw';
import type { Palette } from '../palette';
import type { Item } from '../sort';
import { BACK_JETS, DOWN_JETS, bodyPoint, type Emit } from './hop';
import type { Vehicle } from './vehicle';

const MAX_PUFFS = 220;

class Puff implements Item {
  x0 = 0;
  x1 = 0;
  y0 = 0;
  y1 = 0;
  z0 = 0;
  z1 = 0;
  age = 0;
  rad = 0;
  constructor(
    public x: number, public y: number, public z: number,
    readonly r0: number, readonly r1: number, readonly life: number,
    public vx: number, public vy: number, public vz: number,
    private readonly pal: Palette,
  ) {}

  bounds() {
    const k = this.age / this.life;
    const rad = (this.rad = this.r0 + (this.r1 - this.r0) * (1 - (1 - k) * (1 - k)));
    this.x0 = this.x - rad * 0.7;
    this.x1 = this.x + rad * 0.7;
    this.y0 = this.y - rad * 0.7;
    this.y1 = this.y + rad * 0.7;
    this.z0 = this.z;
    this.z1 = this.z + rad;
  }

  draw(r: R) {
    const k = this.age / this.life;
    const a = Math.min(1, this.age * 10) * (1 - k) ** 1.4 * 0.9;
    if (a <= 0.01) return;
    const ctx = r.ctx;
    const rad = this.rad;
    const X = (this.x - this.y) * C, Y = (this.x + this.y) * 0.5 - this.z - rad * 0.55;
    const [hi, lo] = this.pal.smoke;
    ctx.globalAlpha = a;
    ctx.fillStyle = lo;
    ctx.beginPath();
    ctx.arc(X, Y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.arc(X - rad * 0.16, Y - rad * 0.2, rad * 0.74, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** The smoke in the air: puffs drift, slow down, grow and fade. */
export class Puffs {
  private readonly list: Puff[] = [];
  constructor(private readonly pal: Palette) {}

  readonly emit: Emit = (x, y, z, r0, r1, life, vx, vy, vz) => {
    if (this.list.length < MAX_PUFFS) this.list.push(new Puff(x, y, z, r0, r1, life, vx, vy, vz, this.pal));
  };

  update(dt: number) {
    const damp = Math.exp(-1.8 * dt);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.list.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= damp;
      p.vy *= damp;
    }
  }

  items(out: Item[]) {
    for (const p of this.list) {
      p.bounds();
      out.push(p);
    }
  }
}

const A = [0, 0, 0];
const B = [0, 0, 0];

/** One jet: a tapering flame from a nozzle along (dx, dy, dz), fading out. */
function jet(r: R, color: string, core: string, len: number, w0: number) {
  const ctx = r.ctx;
  const sx = (A[0] - A[1]) * C, sy = (A[0] + A[1]) * 0.5 - A[2];
  const ex = (B[0] - B[1]) * C, ey = (B[0] + B[1]) * 0.5 - B[2];
  let px = -(ey - sy), py = ex - sx;
  const d = Math.hypot(px, py) || 1;
  px /= d;
  py /= d;
  const g = ctx.createLinearGradient(sx, sy, ex, ey);
  g.addColorStop(0, core);
  g.addColorStop(0.3, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(sx + px * w0, sy + py * w0);
  ctx.lineTo(ex + px * w0 * 0.25, ey + py * w0 * 0.25);
  ctx.lineTo(ex - px * w0 * 0.25, ey - py * w0 * 0.25);
  ctx.lineTo(sx - px * w0, sy - py * w0);
  ctx.closePath();
  ctx.fill();
  if (len > 0) {
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(sx, sy, w0 * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * The thrusters' jets: `side` 'under' draws those the body hides part of (under it, or out of a tail turned away),
 * 'over' the rest. Call 'under' before the body and 'over' after it.
 */
export function drawJets(r: R, v: Vehicle, side: 'under' | 'over') {
  const hop = v.hop;
  if (!hop || (hop.down < 0.02 && hop.back < 0.02)) return;
  const ctx = r.ctx;
  const pal = v.pal;
  const flick = 1 + 0.12 * Math.sin(r.t * 47 + v.id) + 0.08 * Math.sin(r.t * 73);
  ctx.save();
  if (r.night) ctx.globalCompositeOperation = 'lighter';
  const upright = Math.cos(v.roll) > 0;
  if (hop.down > 0.02 && (side === 'under') === upright) {
    // straight down out of the body, whichever way it is turned
    const s = Math.sin(v.roll), c = Math.cos(v.roll);
    const dx = -s * v.hy, dy = s * v.hx, dz = -c;
    const len = (0.9 + 1.3 * hop.down) * flick;
    for (const [l, w] of DOWN_JETS) {
      bodyPoint(v, l, w, 0.2, A);
      B[0] = A[0] + dx * len;
      B[1] = A[1] + dy * len;
      B[2] = Math.max(0, A[2] + dz * len);
      jet(r, pal.jet[1], pal.jet[0], len, 0.17);
    }
  }
  const tailAway = v.hx + v.hy > 0;
  if (hop.back > 0.02 && (side === 'under') === tailAway) {
    const len = (0.6 + 2.2 * hop.back) * flick;
    for (const w of BACK_JETS) {
      bodyPoint(v, -2.3, w, 0.42, A);
      B[0] = A[0] - v.hx * len;
      B[1] = A[1] - v.hy * len;
      B[2] = A[2];
      jet(r, pal.jet[1], pal.jet[0], len, 0.15);
    }
  }
  ctx.restore();
}
