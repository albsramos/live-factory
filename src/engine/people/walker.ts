// A walker: a person or a humanoid robot following a list of steps, scripted by an activity or handed out by the
// crowd. It eases its facing towards where it goes, waits for crossings, and can sit, work, chat or carry a box.

import { css, mix, pick, rr, type RGB, type Rng } from '../core';
import { blobShadow } from '../ground';
import type { Ctx, R } from '../draw';
import type { Palette } from '../palette';
import type { Item } from '../sort';
import type { Zone } from '../traffic/zone';
import { drawFigure } from './figure';

export type WalkerKind = 'person' | 'robot';

export interface Step {
  x: number;
  y: number;
  z?: number;
  /** Reserve this zone (a crosswalk) for the stretch leading to this step. */
  zone?: Zone;
  /** Seconds to stand still after arriving. */
  wait?: number;
  /** Face this direction after arriving. */
  face?: [number, number];
  /** Called on arrival. */
  then?: (w: Walker) => void;
  speed?: number;
}

export type Stance = 'stand' | 'sit' | 'work' | 'chat';

let WID = 1;

export class Walker implements Item {
  readonly id = WID++;
  x0 = 0;
  x1 = 0;
  y0 = 0;
  y1 = 0;
  z0 = 0;
  z1 = 0;
  x: number;
  y: number;
  z = 0;
  hx = 1;
  hy = 0;
  speed: number;
  phase: number;
  moving = false;
  steps: Step[] = [];
  waitT = 0;
  holding?: Zone;
  carry = false;
  stance: Stance = 'stand';
  size = 1;
  dead = false;
  hidden = false;
  /** walkway-graph state for wanderers */
  node = -1;
  prev = -1;
  hops = 0;
  ox = 0;
  oy = 0;
  onIdle?: (w: Walker) => void;
  body = '';
  bodyShade = '';
  legs = '';
  head = '';
  arm = '';
  // the colours picked for a person, from the palette's lists (which a theme change recolours in place)
  private top: RGB = [0, 0, 0];
  private bottom: RGB = [0, 0, 0];
  private headBase: RGB = [0, 0, 0];
  private isBottomDark = false;
  private generation = -1;
  /** a robot in the champagne shell rather than the white one, about one in three */
  readonly isGold: boolean;
  /** @internal a per-walker offset for idle animations */
  readonly seed: number;

  constructor(readonly kind: WalkerKind, readonly pal: Palette, rng: Rng, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.seed = rng() * 1000;
    // from the seed, so choosing it takes nothing more from the random stream
    this.isGold = kind === 'robot' && Math.floor(this.seed) % 3 === 0;
    this.phase = rng() * 6.28;
    const a = rng() * Math.PI * 2;
    this.hx = Math.cos(a);
    this.hy = Math.sin(a);
    if (kind === 'robot') {
      this.speed = rr(rng, 1.0, 1.25);
    } else {
      this.speed = rr(rng, 1.05, 1.5);
      this.top = pick(rng, pal.people);
      // (a second pick, once a coloured top: kept so the random stream, and with it the whole scene, stays the same)
      if (rng() < 0.16) this.top = pick(rng, pal.people);
      this.isBottomDark = rng() < 0.5;
      this.bottom = pick(rng, pal.people);
      this.headBase = pick(rng, pal.people);
    }
    this.recolor();
  }

  /** Work out the colours to draw with from the palette, again whenever the theme has changed since. */
  recolor() {
    const pal = this.pal;
    if (this.generation === pal.generation) return;
    this.generation = pal.generation;
    if (this.kind === 'robot') {
      const shell = this.isGold ? pal.botGold : pal.bot;
      this.body = shell.shell;
      this.bodyShade = shell.shade;
      this.legs = shell.shell;
      this.head = pal.bot.dark;
      this.arm = shell.shell;
      return;
    }
    const top = this.top;
    this.body = css(top);
    this.bodyShade = css(mix(top, [40, 42, 56], 0.18));
    this.legs = css(this.isBottomDark ? mix(this.bottom, [60, 62, 70], pal.night ? 0.1 : 0.35) : this.bottom);
    this.head = css(mix(this.headBase, [255, 255, 255], pal.night ? 0.05 : 0.4));
    this.arm = css(mix(top, [40, 42, 56], 0.08));
  }

  go(steps: Step[]) {
    this.steps = steps;
    return this;
  }

  face(x: number, y: number) {
    const d = Math.hypot(x, y) || 1;
    this.hx = x / d;
    this.hy = y / d;
  }

  update(dt: number) {
    if (this.dead) return;
    if (this.waitT > 0) {
      this.waitT -= dt;
      this.moving = false;
      return;
    }
    const st = this.steps[0];
    if (!st) {
      this.moving = false;
      this.onIdle?.(this);
      return;
    }
    if (st.zone && this.holding !== st.zone) {
      if (!st.zone.tryEnter(this, 'ped')) {
        this.moving = false;
        return;
      }
      this.holding = st.zone;
    }
    const dx = st.x - this.x, dy = st.y - this.y;
    const d = Math.hypot(dx, dy);
    const sp = (st.speed ?? 1) * this.speed;
    const step = sp * dt;
    if (d <= step || d < 1e-4) {
      this.x = st.x;
      this.y = st.y;
      if (st.z !== undefined) this.z = st.z;
      this.steps.shift();
      if (this.holding && st.zone === this.holding) {
        this.holding.leave(this);
        this.holding = undefined;
      }
      if (st.wait) this.waitT = st.wait;
      if (st.face) this.face(st.face[0], st.face[1]);
      st.then?.(this);
      this.moving = this.steps.length > 0 && !st.wait;
      this.phase += d * 2.6;
    } else {
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
      if (st.z !== undefined) this.z += ((st.z - this.z) * step) / d;
      // ease the facing towards the direction of travel
      const k = Math.min(1, dt * 9);
      const nx = this.hx + (dx / d - this.hx) * k, ny = this.hy + (dy / d - this.hy) * k;
      const n = Math.hypot(nx, ny) || 1;
      this.hx = nx / n;
      this.hy = ny / n;
      this.moving = true;
      this.phase += step * (this.kind === 'robot' ? 2.3 : 2.6) / this.size;
    }
  }

  bounds() {
    const r = 0.32;
    this.x0 = this.x - r;
    this.x1 = this.x + r;
    this.y0 = this.y - r;
    this.y1 = this.y + r;
    this.z0 = this.z;
    this.z1 = this.z + 1.85 * this.size + (this.carry ? 0.2 : 0);
  }

  shadow(ctx: Ctx) {
    if (this.hidden || this.z > 0.05) return;
    blobShadow(ctx, this.x, this.y, 0.26 * this.size, (this.stance === 'sit' ? 1.2 : 1.75) * this.size);
  }

  draw(r: R) {
    drawFigure(r, this);
  }
}
