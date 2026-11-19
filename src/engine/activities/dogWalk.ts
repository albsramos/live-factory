// Dog walk: someone out with a dog, wandering the walkways; when they leave the scene, another one comes along.

import { C } from '../core';
import type { Ctx, R } from '../draw';
import { blobShadow } from '../ground';
import type { Item } from '../sort';
import type { Walker } from '../people/walker';
import type { Activity, Env } from './activity';

export class DogWalk implements Activity {
  private dogT = 0;
  private dog: { x: number; y: number; hx: number; hy: number; ph: number } | null = null;
  private owner: Walker | null = null;
  private part: Item;

  constructor(private env: Env) {
    const { pal } = env;
    const self = this;
    this.part = {
      x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0.7,
      draw(r: R) {
        const d = self.dog;
        if (!d) return;
        const ctx = r.ctx;
        const X = (d.x - d.y) * C, Y = (d.x + d.y) * 0.5;
        let dX = (d.hx - d.hy) * C, dY = (d.hx + d.hy) * 0.5;
        const l = Math.hypot(dX, dY) || 1;
        dX /= l;
        dY /= l;
        const sw = Math.sin(d.ph) * 0.12;
        ctx.strokeStyle = pal.night ? '#0e0f12' : '#4a4c55';
        ctx.lineCap = 'round';
        ctx.lineWidth = 0.07;
        ctx.beginPath();
        for (const s of [1, -1]) {
          ctx.moveTo(X + dX * 0.22 * s, Y - 0.32 + dY * 0.22 * s * 0.5);
          ctx.lineTo(X + dX * (0.22 * s + sw * s), Y + dY * 0.2 * s * 0.5);
          ctx.moveTo(X + dX * 0.22 * s, Y - 0.32 + dY * 0.22 * s * 0.5);
          ctx.lineTo(X + dX * (0.22 * s - sw * s), Y + dY * 0.2 * s * 0.5);
        }
        ctx.stroke();
        ctx.lineWidth = 0.24;
        ctx.beginPath();
        ctx.moveTo(X - dX * 0.25, Y - 0.38 - dY * 0.12);
        ctx.lineTo(X + dX * 0.25, Y - 0.38 + dY * 0.12);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(X + dX * 0.36, Y - 0.5 + dY * 0.18, 0.13, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        // tail
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        ctx.moveTo(X - dX * 0.3, Y - 0.42 - dY * 0.15);
        ctx.lineTo(X - dX * 0.42, Y - 0.62 + Math.sin(r.t * 9) * 0.05);
        ctx.stroke();
      },
    } as Item;
  }

  update(dt: number) {
    // dog walker
    if (!this.owner || this.owner.dead) {
      this.dog = null;
      this.dogT -= dt;
      if (this.dogT <= 0) {
        this.dogT = 6;
        const w = this.env.crowd.arrival('person');
        this.owner = w;
        this.dog = { x: w.x - 1, y: w.y, hx: 1, hy: 0, ph: 0 };
      }
    }
    const d = this.dog, o = this.owner;
    if (d && o) {
      const tx = o.x - o.hx * 1.3 + 0.5 * -o.hy, ty = o.y - o.hy * 1.3 + 0.5 * o.hx;
      const dx = tx - d.x, dy = ty - d.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.05) {
        const sp = Math.min(dist, dt * Math.max(0.5, dist * 2.2));
        d.x += (dx / dist) * sp;
        d.y += (dy / dist) * sp;
        if (dist > 0.15) {
          d.hx += (dx / dist - d.hx) * Math.min(1, dt * 6);
          d.hy += (dy / dist - d.hy) * Math.min(1, dt * 6);
          const n = Math.hypot(d.hx, d.hy) || 1;
          d.hx /= n;
          d.hy /= n;
          d.ph += sp * 9;
        }
      }
      const it = this.part;
      it.x0 = d.x - 0.4;
      it.x1 = d.x + 0.4;
      it.y0 = d.y - 0.4;
      it.y1 = d.y + 0.4;
    }
  }

  items(out: Item[]) {
    if (this.dog) out.push(this.part);
  }

  shadows(ctx: Ctx) {
    if (this.dog) blobShadow(ctx, this.dog.x, this.dog.y, 0.3, 0.6);
  }
}
