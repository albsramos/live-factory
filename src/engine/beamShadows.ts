// Shadows in a vehicle's head light beam: every other vehicle standing in the beam blocks the light, so the road
// behind it, seen from the lamp, stays dark. Each blocker casts a 2D shadow on the ground (its footprint swept away
// from the lamp), and the beam is clipped to leave those shadows out.

import type { Ctx } from './draw';
import type { Body } from './traffic/legs';
import type { Vehicle } from './traffic/vehicle';

/** a vehicle flying higher than this (the roadster) passes over the beam */
const BLOCKS_BELOW = 1;

/** Convex hull of points (monotone chain), counter-clockwise. */
function hull(pts: number[][]): number[][] {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: number[][] = [], upper: number[][] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** A body's four corners on the ground. */
function corners(b: Body): number[][] {
  const lx = b.hx * b.hl, ly = b.hy * b.hl, wx = -b.hy * b.hw, wy = b.hx * b.hw;
  return [[b.x + lx + wx, b.y + ly + wy], [b.x + lx - wx, b.y + ly - wy], [b.x - lx - wx, b.y - ly - wy], [b.x - lx + wx, b.y - ly + wy]];
}

/**
 * The shadows other vehicles cast in the beam of `v`'s lamp at (x, y), pointing (hx, hy) and reaching `reach`: each
 * one its footprint swept away from the lamp to well past the beam's end.
 */
export function beamShadows(v: Vehicle, vehicles: readonly Vehicle[], x: number, y: number, hx: number, hy: number, reach: number): number[][][] {
  const out: number[][][] = [];
  for (const o of vehicles) {
    if (o === v || o.dead || o.z > BLOCKS_BELOW) continue;
    for (const b of o.bodies) {
      const dx = b.x - x, dy = b.y - y, far = reach + b.hl + b.hw;
      // only what stands ahead of the lamp and within the beam's reach
      if (dx * dx + dy * dy > far * far || dx * hx + dy * hy < -b.hl) continue;
      const cs = corners(b);
      // a lamp inside a body (two vehicles overlapping) lights nothing past it anyway
      if (cs.every(([cx, cy]) => (cx - x) * hx + (cy - y) * hy < 0)) continue;
      const swept = cs.map(([cx, cy]) => {
        const ex = cx - x, ey = cy - y, d = Math.hypot(ex, ey) || 1;
        return [x + (ex / d) * reach * 2, y + (ey / d) * reach * 2];
      });
      out.push(hull([...cs, ...swept]));
    }
  }
  return out;
}

/**
 * Clip the canvas to leave out every shadow: each one is cut away from a square round the lamp by an even-odd clip,
 * and successive clips intersect, so overlapping shadows stay dark too. Call between save() and restore().
 */
export function clipShadows(ctx: Ctx, shadows: readonly number[][][], x: number, y: number, reach: number) {
  const R = reach * 3;
  for (const s of shadows) {
    ctx.beginPath();
    ctx.rect(x - R, y - R, 2 * R, 2 * R);
    s.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.clip('evenodd');
  }
}
