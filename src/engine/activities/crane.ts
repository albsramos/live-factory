// Tower crane on the construction site: swings between the material pile and the slab, hook up and down.

import { C, clamp, lerp, smooth } from '../core';
import { box, type R } from '../draw';
import { boxShadow, lineW } from '../ground';
import type { Item } from '../sort';
import { FnItem } from '../statics';
import type { Activity, Env } from './activity';

export class Crane implements Activity {
  readonly mx = 64.9;
  readonly my = 85.9;
  readonly h = 12.5;
  ang = 0;
  trolley = 8;
  hook = 10;
  loaded = false;
  private t = 0;
  private dropped: { x: number; y: number; t: number }[] = [];
  private readonly pick = [56.6, 85.5, 0.9];
  // set down in the open bay between the frame's columns (x 56, 59.75) and beams (y 91.33, 95.67), so the cable and
  // the load come down through the gaps rather than through a beam
  private readonly drop = [57.9, 93.5, 3.75];
  private parts: Item[] = [];

  constructor(private env: Env) {
    const pal = env.pal;
    const self = this;
    // mast and cab
    env.statics.push(
      new FnItem(this.mx - 0.45, this.my - 0.45, 0, this.mx + 0.45, this.my + 0.45, this.h, (r) => this.drawMast(r), (ctx) =>
        boxShadow(ctx, this.mx - 0.36, this.my - 0.36, this.mx + 0.36, this.my + 0.36, this.h),
      ).still(),
    );
    // jib: always above everything else
    this.parts.push({
      x0: this.mx - 12, x1: this.mx + 12, y0: this.my - 12, y1: this.my + 12, z0: this.h, z1: this.h + 1.6,
      draw: (r: R) => self.drawJib(r),
    } as Item);
    // the cable and hook block, and the load slung under it: two items with tight boxes, so neither overlaps the
    // frame's beams (a box overlapping one in all three axes sorts unpredictably, and flickers)
    this.cableItem = { x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0, draw: (r: R) => self.drawCable(r) } as Item;
    this.loadItem = { x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0, draw: (r: R) => self.drawSlung(r) } as Item;
    this.parts.push(this.cableItem, this.loadItem);
    // material pile
    env.statics.push(
      new FnItem(55.3, 84.4, 0, 57.9, 86.6, 0.8, (r) => {
        for (let i = 0; i < 4; i++) box(r, 55.4, 84.5 + i * 0.5, i % 2 ? 0.4 : 0, 57.8, 84.9 + i * 0.5, i % 2 ? 0.8 : 0.4, pal.steel);
      }).still(),
    );
  }
  private cableItem: Item;
  private loadItem: Item;

  private target(): { ang: number; d: number; hook: number; loaded: boolean } {
    // a 24 s loop
    const T = 24;
    const u = this.t % T;
    const pa = Math.atan2(this.pick[1] - this.my, this.pick[0] - this.mx);
    const pd = Math.hypot(this.pick[1] - this.my, this.pick[0] - this.mx);
    const da = Math.atan2(this.drop[1] - this.my, this.drop[0] - this.mx);
    const dd = Math.hypot(this.drop[1] - this.my, this.drop[0] - this.mx);
    const hi = 9.5;
    const seg = (a: number, b: number) => smooth((u - a) / (b - a));
    if (u < 3) return { ang: pa, d: pd, hook: lerp(hi, this.pick[2] + 1.2, seg(0, 3)), loaded: false };
    if (u < 4) return { ang: pa, d: pd, hook: this.pick[2] + 1.2, loaded: u > 3.6 };
    if (u < 7) return { ang: pa, d: pd, hook: lerp(this.pick[2] + 1.2, hi, seg(4, 7)), loaded: true };
    if (u < 13) {
      const k = seg(7, 13);
      return { ang: lerp(pa, da, k), d: lerp(pd, dd, k), hook: hi, loaded: true };
    }
    if (u < 15.5) return { ang: da, d: dd, hook: lerp(hi, this.drop[2] + 1.2, seg(13, 15.5)), loaded: true };
    if (u < 16.5) return { ang: da, d: dd, hook: this.drop[2] + 1.2, loaded: u < 16 };
    if (u < 18.5) return { ang: da, d: dd, hook: lerp(this.drop[2] + 1.2, hi, seg(16.5, 18.5)), loaded: false };
    const k = seg(18.5, 24);
    return { ang: lerp(da, pa, k), d: lerp(dd, pd, k), hook: hi, loaded: false };
  }

  update(dt: number) {
    this.t += dt;
    const tg = this.target();
    if (this.loaded && !tg.loaded && this.t % 24 > 15) this.dropped.push({ x: this.drop[0], y: this.drop[1], t: 7 });
    this.ang = tg.ang;
    this.trolley = tg.d;
    this.hook = tg.hook;
    this.loaded = tg.loaded;
    for (const d of this.dropped) d.t -= dt;
    this.dropped = this.dropped.filter((d) => d.t > 0);
    const hx = this.mx + Math.cos(this.ang) * this.trolley, hy = this.my + Math.sin(this.ang) * this.trolley;
    const c = this.cableItem;
    c.x0 = hx - 0.15;
    c.x1 = hx + 0.15;
    c.y0 = hy - 0.15;
    c.y1 = hy + 0.15;
    c.z0 = this.hook;
    c.z1 = this.h - 0.2;
    // the load and its slings, from the bottom of the bundle up to the hook (nothing when it hangs empty)
    const l = this.loadItem, w = this.loaded ? 1 : 0;
    l.x0 = hx - 1.3 * w;
    l.x1 = hx + 1.3 * w;
    l.y0 = hy - 0.35 * w;
    l.y1 = hy + 0.35 * w;
    l.z0 = this.hook - 1.2;
    l.z1 = this.loaded ? this.hook : this.hook - 1.2;
  }

  items(out: Item[]) {
    for (const it of this.parts) out.push(it);
    for (const d of this.dropped) {
      const a = clamp(d.t, 0, 1);
      out.push({
        x0: d.x - 1.3, x1: d.x + 1.3, y0: d.y - 0.3, y1: d.y + 0.3, z0: this.drop[2], z1: this.drop[2] + 0.5,
        draw: (r: R) => {
          r.ctx.globalAlpha = a;
          this.drawLoad(r, d.x, d.y, this.drop[2], 0);
          r.ctx.globalAlpha = 1;
        },
      } as Item);
    }
  }

  private drawLoad(r: R, x: number, y: number, z: number, ang: number) {
    // a bundle of beams
    const pal = this.env.pal;
    const c = Math.cos(ang), s = Math.sin(ang);
    const l = Math.abs(c) > Math.abs(s);
    for (let i = 0; i < 2; i++) {
      const zz = z + i * 0.24;
      if (l) box(r, x - 1.25, y - 0.3, zz, x + 1.25, y + 0.3, zz + 0.24, pal.steel);
      else box(r, x - 0.3, y - 1.25, zz, x + 0.3, y + 1.25, zz + 0.24, pal.steel);
    }
  }

  private drawMast(r: R) {
    const pal = this.env.pal;
    const { mx, my, h } = this;
    const ctx = r.ctx;
    box(r, mx - 0.36, my - 0.36, 0, mx + 0.36, my + 0.36, h, pal.factory);
    // lattice
    ctx.beginPath();
    for (let z = 0; z < h - 0.9; z += 0.9) {
      lineW(ctx, mx + 0.36, my + 0.36, z, mx + 0.36, my - 0.36, z + 0.9);
      lineW(ctx, mx - 0.36, my + 0.36, z, mx + 0.36, my + 0.36, z + 0.9);
    }
    ctx.strokeStyle = pal.night ? 'rgba(0,0,0,0.35)' : 'rgba(120,122,134,0.45)';
    ctx.lineWidth = 0.05;
    ctx.stroke();
    // cab
    box(r, mx - 0.5, my - 0.5, h - 1.2, mx + 0.6, my + 0.6, h, pal.white, { edge: 'rgba(255,255,255,0.6)' });
  }

  private drawJib(r: R) {
    const pal = this.env.pal;
    const { mx, my, h } = this;
    const ctx = r.ctx;
    const c = Math.cos(this.ang), s = Math.sin(this.ang);
    const P2 = (d: number, w: number, z: number) => {
      const x = mx + c * d - s * w, y = my + s * d + c * w;
      return [(x - y) * C, (x + y) * 0.5 - z];
    };
    // counter weight
    const cw = [P2(-4.0, 0.45, h + 0.2), P2(-2.7, 0.45, h + 0.2), P2(-2.7, -0.45, h + 0.2), P2(-4.0, -0.45, h + 0.2)];
    // jib as two chords and lacing
    ctx.lineCap = 'round';
    ctx.strokeStyle = pal.factoryDark.left;
    ctx.lineWidth = 0.16;
    ctx.beginPath();
    for (const w of [0.3, -0.3]) {
      const a = P2(-4.0, w, h + 0.1), b = P2(11.5, w, h + 0.1);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    const top0 = P2(-4.0, 0, h + 0.75), top1 = P2(11.5, 0, h + 0.75);
    ctx.moveTo(top0[0], top0[1]);
    ctx.lineTo(top1[0], top1[1]);
    ctx.stroke();
    ctx.lineWidth = 0.05;
    ctx.strokeStyle = pal.factoryDark.right;
    ctx.beginPath();
    for (let d = -4.0; d < 11.4; d += 1.1) {
      const a = P2(d, 0.3, h + 0.1), b = P2(d + 0.55, 0, h + 0.75), e = P2(d + 1.1, -0.3, h + 0.1);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(e[0], e[1]);
    }
    ctx.stroke();
    // apex and ties
    const apex = P2(0, 0, h + 2.6);
    ctx.lineWidth = 0.06;
    ctx.strokeStyle = pal.factoryDark.left;
    ctx.beginPath();
    const m0 = P2(0, 0, h);
    ctx.moveTo(m0[0], m0[1]);
    ctx.lineTo(apex[0], apex[1]);
    ctx.lineTo(top1[0], top1[1]);
    ctx.moveTo(apex[0], apex[1]);
    ctx.lineTo(top0[0], top0[1]);
    ctx.stroke();
    ctx.fillStyle = pal.concrete.right;
    ctx.beginPath();
    ctx.moveTo(cw[0][0], cw[0][1] - 0.7);
    ctx.lineTo(cw[1][0], cw[1][1] - 0.7);
    ctx.lineTo(cw[2][0], cw[2][1] - 0.7);
    ctx.lineTo(cw[3][0], cw[3][1] - 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.concrete.left;
    ctx.fillRect(Math.min(cw[0][0], cw[3][0]), Math.min(cw[0][1], cw[3][1]) - 0.7, Math.abs(cw[0][0] - cw[3][0]) + 0.01, 0.75);
    // trolley
    const tp = P2(this.trolley, 0, h + 0.05);
    ctx.fillStyle = pal.dark.left;
    ctx.fillRect(tp[0] - 0.3, tp[1] - 0.1, 0.6, 0.25);
    // red beacon at the tip at night
    if (r.night) {
      const tip = P2(11.5, 0, h + 0.8);
      ctx.fillStyle = Math.sin(r.t * 3) > 0 ? '#ff5a50' : '#5a1f1c';
      ctx.beginPath();
      ctx.arc(tip[0], tip[1], 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private hookAt() {
    return [this.mx + Math.cos(this.ang) * this.trolley, this.my + Math.sin(this.ang) * this.trolley];
  }

  /** The cable from the trolley down to the hook block. */
  private drawCable(r: R) {
    const ctx = r.ctx, [x, y] = this.hookAt();
    ctx.strokeStyle = this.env.pal.night ? '#0c0c0e' : '#5b5d66';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    lineW(ctx, x, y, this.h, x, y, this.hook);
    ctx.stroke();
    ctx.fillStyle = this.env.pal.dark.left;
    const X = (x - y) * C, Y = (x + y) * 0.5 - this.hook;
    ctx.fillRect(X - 0.12, Y, 0.24, 0.22);
  }

  /** The load slung under the hook, when there is one. */
  private drawSlung(r: R) {
    if (!this.loaded) return;
    const ctx = r.ctx, [x, y] = this.hookAt();
    ctx.strokeStyle = this.env.pal.night ? '#0c0c0e' : '#5b5d66';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    lineW(ctx, x, y, this.hook, x - 1.0, y, this.hook - 1.0);
    lineW(ctx, x, y, this.hook, x + 1.0, y, this.hook - 1.0);
    ctx.stroke();
    this.drawLoad(r, x, y, this.hook - 1.2, 0);
  }
}
