// Doors that open at the robotaxi stop: the van's big glass door slides back, and the pod's butterfly doors swing up
// about a hinge at the front of the opening until they stand nearly upright, rear edge highest, leaning out.

import { C, type Mat, lightT } from '../core';
import type { R } from '../draw';
import type { Vehicle } from './vehicle';

/** the dark inside of a door opening */
const OPENING = '#1c1d22';

/**
 * The pod's door on its +w flank, closed, as (l, z, w) points: mostly paint, with its window a band along the top
 * (the car's side glass reaches lower, but on the door the panel carries up to the window).
 */
const POD_LOWER = [[0.85, 0.42, 0.95], [-0.6, 0.42, 0.95], [-0.69, 0.98, 0.87], [0.53, 0.98, 0.85]];
const POD_GLASS = [[-0.69, 0.98, 0.87], [-0.72, 1.12, 0.79], [0.2, 1.17, 0.76], [0.53, 0.98, 0.85]];
/** The pod door's hinge at the front of the opening, as (l, z, w), and its axis: across the car, tipped a little down
 * towards the outside, so the door leans out as it rises and its outer face turns to the side. */
const HINGE = [0.8, 0.8, 0.94];
const AXIS = [0, -0.35, 1];
/** how far a fully open butterfly door has turned about its hinge (radians) */
const SWING = 1.25;

/**
 * Turn (l, w, z) about the axis through `a` and `b` by `th` radians (Rodrigues' rotation), all in the vehicle's
 * own frame.
 */
function turn(p: number[], a: number[], b: number[], th: number): number[] {
  const ax = b.map((x, i) => x - a[i]), n = Math.hypot(ax[0], ax[1], ax[2]);
  const u = ax.map((x) => x / n), d = p.map((x, i) => x - a[i]);
  const c = Math.cos(th), s = Math.sin(th), dot = u[0] * d[0] + u[1] * d[1] + u[2] * d[2];
  const cr = [u[1] * d[2] - u[2] * d[1], u[2] * d[0] - u[0] * d[2], u[0] * d[1] - u[1] * d[0]];
  return d.map((x, i) => a[i] + x * c + cr[i] * s + u[i] * dot * (1 - c));
}

/** Where a point of the vehicle (along it, across it, up) lands on the canvas. */
function at(v: Vehicle, l: number, w: number, z: number): number[] {
  const x = v.x + v.hx * l - v.hy * w, y = v.y + v.hy * l + v.hx * w;
  return [(x - y) * C, (x + y) * 0.5 - z];
}

function fill(r: R, color: string, pts: number[][]) {
  const ctx = r.ctx;
  ctx.beginPath();
  pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = r.hair;
  ctx.stroke();
}

/**
 * The doors on the flanks that face the camera (`isNear`), drawn after the body, or on the flanks that face away,
 * drawn before it: a far butterfly door rises above the roof, and the body stands in front of it.
 */
export function drawDoors(r: R, v: Vehicle, isNear: boolean) {
  const k = v.door;
  for (const side of [1, -1]) {
    // the flank's outward normal is (-hy, hx) · side
    const isFacing = (v.hx - v.hy) * side > 0;
    if (isFacing !== isNear) continue;
    if (v.kind === 'van') {
      // the van's big glass door mid-side (see its mesh) slides back: an opening that grows; only the near one shows
      if (!isNear) continue;
      const l0 = -0.95, open = k * 1.9, w = side * v.hw * 0.98;
      fill(r, OPENING, [[l0, 0.42], [l0 + open, 0.42], [l0 + open, 1.56], [l0, 1.56]].map(([l, z]) => at(v, l, w, z)));
      continue;
    }
    // the pod: the dark opening where the door was, then the door turned up and out about the pillar
    const flip = ([l, z, w]: number[]) => [l, side * w, z];
    const opening = [POD_LOWER[0], POD_LOWER[1], POD_GLASS[1], POD_GLASS[2], [0.85, 0.8, 0.92]];
    r.ctx.globalAlpha = Math.min(1, k * 2);
    fill(r, OPENING, opening.map(flip).map(([l, w, z]) => at(v, l, w, z)));
    r.ctx.globalAlpha = 1;
    // mirrored on the -w flank, where the same turn runs the other way
    const pa = flip(HINGE), pb = pa.map((x, i) => x + flip(AXIS)[i]), th = side * k * SWING;
    const swung = (p: number[]) => {
      const [l, w, z] = turn(flip(p), pa, pb, th);
      return at(v, l, w, z);
    };
    // the door's outer face points along its turned normal: show the paint and glass when that faces the camera
    // (which looks from +x +y +z), and the dark inside of the door otherwise
    const [nl, nw, nz] = turn([pa[0], pa[1] + side, pa[2]], pa, pb, th).map((x, i) => x - pa[i]);
    const nx = nl * v.hx - nw * v.hy, ny = nl * v.hy + nw * v.hx, t = lightT(nx, ny, nz);
    if (nx + ny + nz > 0) {
      fill(r, (v.mats[0] as Mat).at(t), POD_LOWER.map(swung));
      fill(r, (v.mats[1] as Mat).at(t), POD_GLASS.map(swung));
    } else fill(r, v.pal.dark.at(t), [POD_LOWER[0], POD_LOWER[1], ...POD_GLASS, [0.85, 0.8, 0.92]].map(swung));
  }
}
