// Doors that open at the robotaxi stop: the van's big glass door slides back, and the pod's butterfly doors swing up
// from a hinge at the front of the opening until they stand nearly upright, leaning forward, tops tilted out.

import { C, type Mat } from '../core';
import type { R } from '../draw';
import type { Vehicle } from './vehicle';

/** the dark inside of a door opening */
const OPENING = '#1c1d22';

/** The pod's door on its +w flank, closed, as (l, z, w) points: the lower panel in paint, the glass above it. */
const POD_LOWER = [[0.85, 0.42, 0.95], [-0.6, 0.42, 0.95], [-0.66, 0.8, 0.92], [0.85, 0.8, 0.92]];
const POD_GLASS = [[-0.66, 0.8, 0.92], [-0.72, 1.12, 0.79], [0.2, 1.17, 0.76], [0.85, 0.8, 0.92]];
/** where the pod's doors hinge, at the front of the opening, behind the front wheel: (l, z) */
const HINGE = [0.8, 0.75];
/** how far a fully open butterfly door has swung up (radians) */
const SWING = 1.3;

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
    // the pod: the dark opening where the door was, then the door swung up about its hinge, its far end (now its top)
    // tilted out from the body
    const opening = [POD_LOWER[0], POD_LOWER[1], POD_GLASS[1], POD_GLASS[2]];
    r.ctx.globalAlpha = Math.min(1, k * 2);
    fill(r, OPENING, opening.map(([l, z, w]) => at(v, l, side * w, z)));
    r.ctx.globalAlpha = 1;
    const c = Math.cos(k * SWING), s = Math.sin(k * SWING);
    const swung = ([l, z, w]: number[]) => {
      const dl = l - HINGE[0], dz = z - HINGE[1];
      const out = k * (0.08 + 0.32 * Math.min(1, Math.max(0, -dl) / 1.5));
      return at(v, HINGE[0] + dl * c + dz * s, side * (w + out), HINGE[1] + dz * c - dl * s);
    };
    fill(r, (v.mats[0] as Mat).at(0.55 + k * 0.25), POD_LOWER.map(swung));
    fill(r, (v.mats[1] as Mat).at(0.4), POD_GLASS.map(swung));
  }
}
