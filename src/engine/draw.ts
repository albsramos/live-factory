// Drawing primitives in design space (the camera transform is already on the context): the render context, shaded
// quads and boxes, and drawing onto a box's faces.

import { C, type Mat } from './core';
import { shadeFace, type Caster } from './shade';

export type Ctx = CanvasRenderingContext2D;

/** Everything a drawable needs at draw time. */
export interface R {
  ctx: Ctx;
  /** Scene clock in seconds. */
  t: number;
  /** Width in design units of half a device pixel; strokes this wide hide anti-aliasing seams between faces. */
  hair: number;
  /** Device pixels per design unit. */
  scale: number;
  night: boolean;
  /** buildings whose shadows fall on other objects, and the tint for the shaded part of a face */
  casters?: readonly Caster[];
  faceShadow?: string;
}

function quadPath(ctx: Ctx, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.lineTo(dx, dy);
  ctx.closePath();
}

export function fillQuad(r: R, fill: string, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const ctx = r.ctx;
  quadPath(ctx, ax, ay, bx, by, cx, cy, dx, dy);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = fill;
  ctx.lineWidth = r.hair;
  ctx.stroke();
}

export interface BoxStyle {
  top?: string;
  left?: string;
  right?: string;
  /** Soft highlight along the front edges, which reads as a rounded clay edge. */
  edge?: string | null;
  edgeW?: number;
}

/** An axis-aligned box. Only the three faces that face the camera are drawn. */
export function box(r: R, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: Mat, st?: BoxStyle, owner?: unknown) {
  const X00 = (x0 - y0) * C, X10 = (x1 - y0) * C, X11 = (x1 - y1) * C, X01 = (x0 - y1) * C;
  const Y00 = (x0 + y0) * 0.5, Y10 = (x1 + y0) * 0.5, Y11 = (x1 + y1) * 0.5, Y01 = (x0 + y1) * 0.5;
  const top = st?.top ?? m.top, left = st?.left ?? m.left, right = st?.right ?? m.right;
  if (z1 - z0 > 0.001) {
    fillQuad(r, left, X01, Y01 - z1, X11, Y11 - z1, X11, Y11 - z0, X01, Y01 - z0);
    fillQuad(r, right, X11, Y11 - z1, X10, Y10 - z1, X10, Y10 - z0, X11, Y11 - z0);
  }
  fillQuad(r, top, X00, Y00 - z1, X10, Y10 - z1, X11, Y11 - z1, X01, Y01 - z1);
  // shadows from nearby buildings on each visible face
  if (r.casters?.length && r.faceShadow) {
    const f = r.faceShadow;
    if (z1 - z0 > 0.001) {
      shadeFace(r.ctx, [x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0], r.casters, f, owner);
      shadeFace(r.ctx, [x1, y1, z1, x1, y0, z1, x1, y0, z0, x1, y1, z0], r.casters, f, owner);
    }
    shadeFace(r.ctx, [x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1], r.casters, f, owner);
  }
  const edge = st?.edge;
  if (edge) {
    const ctx = r.ctx;
    ctx.beginPath();
    ctx.moveTo(X01, Y01 - z1);
    ctx.lineTo(X11, Y11 - z1);
    ctx.lineTo(X10, Y10 - z1);
    if (z1 - z0 > 0.4) {
      ctx.moveTo(X11, Y11 - z1);
      ctx.lineTo(X11, Y11 - z0);
    }
    ctx.strokeStyle = edge;
    ctx.lineWidth = st?.edgeW ?? 0.09;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

/** Run `fn` with the context mapped onto the +x face of a box: local u runs left→right, v runs down from z1. */
export function onFaceX(r: R, x1: number, y0: number, y1: number, z1: number, fn: (ctx: Ctx, w: number) => void) {
  const ctx = r.ctx;
  ctx.save();
  ctx.transform(C, -0.5, 0, 1, (x1 - y1) * C, (x1 + y1) * 0.5 - z1);
  fn(ctx, y1 - y0);
  ctx.restore();
}

/** Run `fn` with the context mapped onto the +y face of a box: local u runs left→right, v runs down from z1. */
export function onFaceY(r: R, x0: number, x1: number, y1: number, z1: number, fn: (ctx: Ctx, w: number) => void) {
  const ctx = r.ctx;
  ctx.save();
  ctx.transform(C, 0.5, 0, 1, (x0 - y1) * C, (x0 + y1) * 0.5 - z1);
  fn(ctx, x1 - x0);
  ctx.restore();
}

/**
 * Run `fn` with the context mapped onto an upright wall standing on the line from (ax, ay) to (bx, by), at any
 * angle: local u runs from a to b in metres (put a on the screen's left), v runs down from z1.
 */
export function onWall(r: R, ax: number, ay: number, bx: number, by: number, z1: number, fn: (ctx: Ctx, w: number) => void) {
  const w = Math.hypot(bx - ax, by - ay), ex = (bx - ax) / w, ey = (by - ay) / w;
  const ctx = r.ctx;
  ctx.save();
  ctx.transform((ex - ey) * C, (ex + ey) * 0.5, 0, 1, (ax - ay) * C, (ax + ay) * 0.5 - z1);
  fn(ctx, w);
  ctx.restore();
}

/** Run `fn` with the context mapped onto a horizontal plane at height z: local p runs along +x, q along +y. */
export function onTop(r: R, x0: number, y0: number, z: number, fn: (ctx: Ctx) => void) {
  const ctx = r.ctx;
  ctx.save();
  ctx.transform(C, 0.5, -C, 0.5, (x0 - y0) * C, (x0 + y0) * 0.5 - z);
  fn(ctx);
  ctx.restore();
}
