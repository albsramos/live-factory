// Baking unchanging scenery: each static item is drawn once into a bitmap aligned to device pixels (cropped to the
// view), then stamped every frame.

import { C } from './core';
import type { R } from './draw';
import type { Palette } from './palette';
import type { Caster } from './shade';
import { makeCanvas } from './sprites';
import type { Static } from './statics';

export interface Baked {
  img: HTMLCanvasElement | OffscreenCanvas | null;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The camera a bitmap is baked for: design units to pixels, the offset, and the view in design units. */
export interface BakeView {
  k: number;
  tx: number;
  ty: number;
  view: { x0: number; y0: number; x1: number; y1: number };
}

export function bake(it: Static, cam: BakeView, pal: Palette, casters: Caster[]): Baked {
  const { k, tx, ty, view: v } = cam;
  // screen bounds of the box, with room for anti-aliasing and edge highlights
  const sx0 = Math.max(v.x0, (it.x0 - it.y1) * C - 0.3), sx1 = Math.min(v.x1, (it.x1 - it.y0) * C + 0.3);
  const sy0 = Math.max(v.y0, (it.x0 + it.y0) * 0.5 - it.z1 - 0.3), sy1 = Math.min(v.y1, (it.x1 + it.y1) * 0.5 - it.z0 + 0.3);
  const px0 = Math.floor(sx0 * k + tx), px1 = Math.ceil(sx1 * k + tx);
  const py0 = Math.floor(sy0 * k + ty), py1 = Math.ceil(sy1 * k + ty);
  const W = px1 - px0, H = py1 - py0;
  if (W <= 0 || H <= 0) return { img: null, x: 0, y: 0, w: 0, h: 0 };
  const img = makeCanvas(W, H);
  const g = img.getContext('2d') as CanvasRenderingContext2D;
  g.setTransform(k, 0, 0, k, tx - px0, ty - py0);
  it.draw({ ctx: g, t: 0, hair: 0.7 / k, scale: k, night: pal.night, casters, faceShadow: pal.faceShadow });
  return { img, x: (px0 - tx) / k, y: (py0 - ty) / k, w: W / k, h: H / k };
}

/** Stamp an item's bitmap, baking it first if it has none in `cache`. */
export function stamp(it: Static, r: R, cache: WeakMap<object, Baked>, make: () => Baked) {
  let b = cache.get(it);
  if (!b) cache.set(it, (b = make()));
  if (b.img) r.ctx.drawImage(b.img as CanvasImageSource, b.x, b.y, b.w, b.h);
}
