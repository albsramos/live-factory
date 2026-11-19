// Shapes on the ground: shadows, polygons, arcs and lines in world space. Shadows are added to the current path so
// many fill in one go without darkening where they overlap.

import { C, SHADOW_DX, SHADOW_DY } from './core';
import type { Ctx } from './draw';

const HULL: number[] = [];
const HP: number[] = [];

function cross(o: number, a: number, b: number) {
  return (HP[a * 2] - HP[o * 2]) * (HP[b * 2 + 1] - HP[o * 2 + 1]) - (HP[a * 2 + 1] - HP[o * 2 + 1]) * (HP[b * 2] - HP[o * 2]);
}

/** Add the convex hull of world points (x, y pairs on the ground) to the current path. */
export function hullPath(ctx: Ctx, pts: number[]) {
  const n = pts.length / 2;
  HP.length = 0;
  for (let i = 0; i < pts.length; i++) HP.push(pts[i]);
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => HP[a * 2] - HP[b * 2] || HP[a * 2 + 1] - HP[b * 2 + 1]);
  HULL.length = 0;
  for (const i of order) {
    while (HULL.length >= 2 && cross(HULL[HULL.length - 2], HULL[HULL.length - 1], i) <= 0) HULL.pop();
    HULL.push(i);
  }
  const lower = HULL.length + 1;
  for (let k = order.length - 2; k >= 0; k--) {
    const i = order[k];
    while (HULL.length >= lower && cross(HULL[HULL.length - 2], HULL[HULL.length - 1], i) <= 0) HULL.pop();
    HULL.push(i);
  }
  HULL.pop();
  for (let k = 0; k < HULL.length; k++) {
    const i = HULL[k];
    const X = (HP[i * 2] - HP[i * 2 + 1]) * C, Y = (HP[i * 2] + HP[i * 2 + 1]) * 0.5;
    if (k === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  ctx.closePath();
}

const SP: number[] = [];

/** Shadow of an axis-aligned box of height h standing on the ground. */
export function boxShadow(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, h: number, base = 0) {
  const dx = SHADOW_DX * h, dy = SHADOW_DY * h, bx = SHADOW_DX * base, by = SHADOW_DY * base;
  SP.length = 0;
  SP.push(x0 + bx, y0 + by, x1 + bx, y0 + by, x1 + bx, y1 + by, x0 + bx, y1 + by);
  SP.push(x0 + dx, y0 + dy, x1 + dx, y0 + dy, x1 + dx, y1 + dy, x0 + dx, y1 + dy);
  hullPath(ctx, SP);
}

/** Shadow of an oriented rectangle (centre, heading, half length/width) of height h. */
export function rectShadow(ctx: Ctx, cx: number, cy: number, hx: number, hy: number, hl: number, hw: number, h: number) {
  const dx = SHADOW_DX * h, dy = SHADOW_DY * h;
  SP.length = 0;
  const lx = hx * hl, ly = hy * hl, wx = -hy * hw, wy = hx * hw;
  for (const [a, b] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    const x = cx + lx * a + wx * b, y = cy + ly * a + wy * b;
    SP.push(x, y, x + dx, y + dy);
  }
  hullPath(ctx, SP);
}

/** A soft round shadow (trees, people): an ellipse on the ground stretched along the light. */
export function blobShadow(ctx: Ctx, x: number, y: number, rad: number, h: number) {
  const ox = x + SHADOW_DX * h * 0.5, oy = y + SHADOW_DY * h * 0.5;
  const X = (ox - oy) * C, Y = (ox + oy) * 0.5;
  const len = Math.hypot((SHADOW_DX - SHADOW_DY) * C, (SHADOW_DX + SHADOW_DY) * 0.5) * h * 0.5;
  ctx.moveTo(X + rad * C + len, Y);
  ctx.ellipse(X, Y, rad * C + len, rad * 0.5 + len * 0.12, 0.2, 0, Math.PI * 2);
}

/** Add a world-space ground polygon (x, y pairs) to the current path. */
export function groundPoly(ctx: Ctx, pts: number[], z = 0) {
  for (let i = 0; i < pts.length; i += 2) {
    const X = (pts[i] - pts[i + 1]) * C, Y = (pts[i] + pts[i + 1]) * 0.5 - z;
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  ctx.closePath();
}

export function groundRect(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, z = 0) {
  groundPoly(ctx, [x0, y0, x1, y0, x1, y1, x0, y1], z);
}

/** Points along a world-space arc (centre, radius, start angle, sweep), as x, y pairs. */
export function arcPts(cx: number, cy: number, rad: number, a0: number, da: number, steps = 14): number[] {
  const out: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (da * i) / steps;
    out.push(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  return out;
}

export function lineW(ctx: Ctx, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  ctx.moveTo((x0 - y0) * C, (x0 + y0) * 0.5 - z0);
  ctx.lineTo((x1 - y1) * C, (x1 + y1) * 0.5 - z1);
}
