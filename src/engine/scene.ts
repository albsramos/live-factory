// Runs the world on a canvas: camera fit, a cached ground layer (roads, markings, baked shadows), and the frame loop.

import { bake, stamp, type Baked } from './bake';
import type { R } from './draw';
import { darkPalette, lightPalette, morphPalette, type Palette } from './palette';
import { depthSort, type Item } from './sort';
import { Sprites, makeCanvas } from './sprites';
import { type Static } from './statics';
import { groundShadows } from './groundShadows';
import { buildWorld, type World } from './world/world';
import { DEFAULTS, fitView, type SceneOptions } from './frame';
import { Pacer, qualityLevels, type Quality } from './pacer';

/** seconds a theme change takes to dissolve */
const FADE = 0.6;

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export class Scene {
  private opts: SceneOptions;
  private ctx: CanvasRenderingContext2D;
  private pal: Palette;
  private sprites: Sprites;
  private world!: World;
  private ground: AnyCanvas | null = null;
  private groundDirty = true;
  private cssW = 0;
  private cssH = 0;
  private scale = 1;
  private tx = 0;
  private ty = 0;
  private view = { x0: 0, y0: 0, x1: 0, y1: 0 };
  private raf = 0;
  private last = 0;
  private visible = true;
  private t = 0;
  private dyn: Item[] = [];
  private all: Item[] = [];
  private order: Item[] = [];
  private destroyed = false;
  /** the last frame of the previous theme, dissolving away */
  private fade: AnyCanvas | null = null;
  private fadeT = 0;
  private pacer = new Pacer();
  /** quality levels, best first (pacer.ts), and the one in use: it only goes down, when frames run slow */
  private levels: Quality[] = [];
  private level = 0;

  constructor(private canvas: HTMLCanvasElement, opts: Partial<SceneOptions> = {}) {
    this.opts = { ...DEFAULTS, ...opts };
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('live-factory: 2D canvas is not available');
    this.ctx = ctx;
    this.pal = this.opts.theme === 'dark' ? darkPalette() : lightPalette();
    this.sprites = new Sprites(this.pal, 1);
    this.branding.isOn = this.opts.branded;
    canvas.addEventListener('contextrestored', this.onRestored);
    this.rebuild();
  }

  /** After the GPU drops the canvases (sleep, a driver reset), the cached bitmaps may be wiped too: bake them again. */
  private onRestored = () => {
    this.sprites.clear();
    this.baked = new WeakMap();
    this.groundDirty = true;
    this.sync();
  };

  /** Update options; rebuilds the world only when the seed or density change. A new theme recolours it as it stands. */
  set(opts: Partial<SceneOptions>) {
    const prev = this.opts;
    this.opts = { ...prev, ...opts };
    const o = this.opts;
    if (o.theme !== prev.theme) {
      // keep the outgoing frame and dissolve it over the new theme
      if (this.cssW && this.canvas.width > 1) {
        if (!this.fade || this.fade.width !== this.canvas.width || this.fade.height !== this.canvas.height) this.fade = makeCanvas(this.canvas.width, this.canvas.height);
        const f = this.fade.getContext('2d') as CanvasRenderingContext2D;
        f.setTransform(1, 0, 0, 1, 0, 0);
        f.drawImage(this.canvas, 0, 0);
        this.fadeT = FADE;
      }
      // the same moment in the other theme: everything holds this palette, so recolouring it recolours the scene
      morphPalette(this.pal, o.theme === 'dark' ? darkPalette() : lightPalette());
      this.sprites.clear();
      this.baked = new WeakMap();
      this.groundDirty = true;
      this.pacer.settle(performance.now());
    }
    if (o.branded !== prev.branded) {
      // the lettering is part of the factory's baked front: flip it and bake again
      this.branding.isOn = o.branded;
      this.baked = new WeakMap();
    }
    if (o.seed !== prev.seed || o.density !== prev.density) this.rebuild();
    // new limits start again from the best quality they allow
    const lowered = this.level > 0 && (o.maxFps !== prev.maxFps || o.maxDpr !== prev.maxDpr || o.adaptive !== prev.adaptive);
    if (lowered) this.level = 0;
    if (lowered || o.fit !== prev.fit || o.focusX !== prev.focusX || o.focusY !== prev.focusY || o.maxDpr !== prev.maxDpr || o.zoom !== prev.zoom) this.layout();
    else this.levels = qualityLevels(o.maxFps, o.maxDpr, this.deviceDpr());
    this.sync();
  }

  private rebuild() {
    this.sprites.reset(this.pal, this.scale);
    this.world = buildWorld(this.pal, this.sprites, { seed: this.opts.seed, density: this.opts.density, branding: this.branding });
    this.t = 0;
    // run the world for a while so the first frame is already busy
    for (let i = 0; i < 40 * 20; i++) this.step(1 / 20);
    this.groundDirty = true;
  }

  /** Tell the scene its size in CSS pixels. */
  resize(w: number, h: number) {
    this.cssW = Math.max(1, Math.round(w));
    this.cssH = Math.max(1, Math.round(h));
    this.layout();
    this.sync();
  }

  /** Pause drawing while the canvas is off screen. */
  setVisible(v: boolean) {
    this.visible = v;
    this.sync();
  }

  private deviceDpr() {
    return (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  }

  /** The frame rate and pixel density in use. */
  get quality(): Quality {
    return this.levels[Math.min(this.level, this.levels.length - 1)];
  }

  /** Frames ran slow: step down to the next quality level, if there is one. */
  private lower() {
    if (this.level >= this.levels.length - 1) return;
    const dpr = this.quality.dpr;
    this.level++;
    if (this.quality.dpr !== dpr) this.layout();
    this.pacer.settle(performance.now());
  }

  private layout() {
    const o = this.opts;
    this.levels = qualityLevels(o.maxFps, o.maxDpr, this.deviceDpr());
    const dpr = this.quality.dpr;
    const W = this.cssW, H = this.cssH;
    const pw = Math.max(1, Math.round(W * dpr)), ph = Math.max(1, Math.round(H * dpr));
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    const { zoom, cx, cy, hw, hh } = fitView(W, H, o);
    this.scale = zoom * dpr;
    // whole-pixel offsets keep baked bitmaps aligned to the device grid
    this.tx = Math.round(pw / 2 - cx * this.scale);
    this.ty = Math.round(ph / 2 - cy * this.scale);
    this.view = { x0: cx - hw - 2, y0: cy - hh - 2, x1: cx + hw + 2, y1: cy + hh + 2 };
    this.sprites.reset(this.pal, this.scale);
    this.baked = new WeakMap();
    this.groundDirty = true;
    this.pacer.settle(performance.now());
  }

  private baked = new WeakMap<Item, Baked>();
  /** shared with the world, so the lettering can change without a rebuild */
  private readonly branding = { isOn: false };

  /** Render an unchanging item once into a bitmap aligned to device pixels (bake.ts), then stamp it. */
  private stamp(it: Static, r: R) {
    stamp(it, r, this.baked, () => bake(it, { k: this.scale, tx: this.tx, ty: this.ty, view: this.view }, this.pal, this.world.casters));
  }

  private sync() {
    if (this.destroyed || !this.cssW) return;
    const run = this.visible && (!this.opts.paused || this.fadeT > 0);
    if (run && !this.raf) {
      this.last = 0;
      this.raf = requestAnimationFrame(this.loop);
    } else if (!run && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    if (!run) this.render();
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const fps = this.quality.fps;
    if (!this.pacer.tick(now, fps)) return;
    const t0 = performance.now();
    const dt = this.last ? Math.min(Math.max(0.1, fps > 0 ? 2 / fps : 0), (now - this.last) / 1000) : 0;
    this.last = now;
    let rem = this.opts.paused ? 0 : dt * this.opts.speed;
    while (rem > 1e-6) {
      const h = Math.min(rem, 1 / 30);
      this.step(h);
      rem -= h;
    }
    this.render();
    if (this.opts.adaptive && this.pacer.record(now, performance.now() - t0, fps)) this.lower();
    if (this.fadeT > 0) {
      this.fadeT = Math.max(0, this.fadeT - dt);
      // a paused scene only kept running for the dissolve
      if (this.fadeT === 0 && this.opts.paused) this.sync();
    }
  };

  private step(dt: number) {
    this.t += dt;
    this.world.update(dt);
  }

  private renderGround() {
    const c = this.canvas;
    if (!this.ground || this.ground.width !== c.width || this.ground.height !== c.height) this.ground = makeCanvas(c.width, c.height);
    const g = this.ground.getContext('2d') as CanvasRenderingContext2D;
    const pal = this.pal;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = pal.ground;
    g.fillRect(0, 0, c.width, c.height);
    g.setTransform(this.scale, 0, 0, this.scale, this.tx, this.ty);
    const r = this.r(g);
    this.world.ground(g, r);
    groundShadows(g, this.world.statics, pal, this.scale, this.view);
    this.groundDirty = false;
  }

  private r(ctx: CanvasRenderingContext2D): R {
    return { ctx, t: this.t, hair: 0.7 / this.scale, scale: this.scale, night: this.pal.night, casters: this.world.casters, faceShadow: this.pal.faceShadow };
  }

  render() {
    if (!this.cssW) return;
    if (this.groundDirty) this.renderGround();
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.ground as CanvasImageSource, 0, 0);
    ctx.setTransform(this.scale, 0, 0, this.scale, this.tx, this.ty);
    const r = this.r(ctx);
    // moving shadows, all in one fill so overlaps don't darken
    ctx.beginPath();
    this.world.shadows(ctx);
    ctx.fillStyle = this.pal.shadow;
    ctx.fill();
    // headlights and tail lights on the road, under the vehicles that cast them
    if (this.pal.night) this.world.lights(ctx);
    // everything standing up, back to front
    this.dyn.length = 0;
    this.world.items(this.dyn);
    const all = this.all;
    all.length = 0;
    for (const s of this.world.statics) all.push(s);
    for (const d of this.dyn) all.push(d);
    depthSort(all, this.order, this.view.x0, this.view.y0, this.view.x1, this.view.y1);
    for (const it of this.order) {
      const s = it as Static;
      if (s.bake) this.stamp(s, r);
      else it.draw(r);
      s.overlay?.(r);
    }
    if (this.fade && this.fadeT > 0) {
      const k = this.fadeT / FADE;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = k * k * (3 - 2 * k);
      ctx.drawImage(this.fade as CanvasImageSource, 0, 0, this.canvas.width, this.canvas.height);
      ctx.globalAlpha = 1;
    }
  }

  destroy() {
    this.destroyed = true;
    this.canvas.removeEventListener('contextrestored', this.onRestored);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
