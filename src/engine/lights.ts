// Vehicle lights at night: beams thrown onto the road from the ends of each light bar, a red glow behind, and the
// lamps themselves glinting on the body.
//
// The road pass (`drawRoadLight`) runs after the ground and the moving shadows but before anything standing up, so
// a vehicle's own body hides the start of its beams and anything in front of them covers them, as it would.

import { C } from './core';
import type { Ctx, R } from './draw';
import type { Vehicle } from './traffic/vehicle';
import type { VehicleKind } from './traffic/meshes';

/** Light bar position per kind, from the meshes in vehicles.ts: [distance along the body, half width, height]. */
type Bar = readonly [number, number, number];
const BARS: Partial<Record<VehicleKind, { front: Bar; rear: Bar; reach: number }>> = {
  suv: { front: [2.42, 0.7, 0.78], rear: [-2.38, 0.72, 0.94], reach: 7 },
  pickup: { front: [2.85, 0.98, 0.94], rear: [-2.85, 1.0, 1.18], reach: 7.5 },
  pod: { front: [1.9, 0.38, 0.58], rear: [-1.9, 0.4, 0.59], reach: 5.5 },
  van: { front: [3.6, 0.55, 1.22], rear: [-3.6, 0.55, 1.22], reach: 7.5 },
  roadster: { front: [2.3, 0.6, 0.51], rear: [-2.3, 0.62, 0.49], reach: 7.5 },
  semi: { front: [3.2, 1.0, 1.24], rear: [-12.8, 1.0, 1.38], reach: 9.5 },
};

const BEAM = [255, 238, 204] as const;
const TAIL = [255, 64, 52] as const;
const rgba = (c: readonly number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** Map world ground coordinates straight onto the canvas, so shapes can be drawn in metres. */
function onGround(ctx: Ctx) {
  ctx.transform(C, 0.5, -C, 0.5, 0, 0);
}

/** A cone of light on the road: narrow at the lamp, spreading and fading ahead. */
function cone(ctx: Ctx, x: number, y: number, hx: number, hy: number, reach: number, spread: number, a: number) {
  const px = -hy, py = hx;
  const g = ctx.createLinearGradient(x, y, x + hx * reach, y + hy * reach);
  g.addColorStop(0, rgba(BEAM, a));
  g.addColorStop(0.35, rgba(BEAM, a * 0.55));
  g.addColorStop(1, rgba(BEAM, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + px * 0.12, y + py * 0.12);
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const t = -spread + (2 * spread * i) / steps;
    const c = Math.cos(t), s = Math.sin(t);
    ctx.lineTo(x + (hx * c - hy * s) * reach, y + (hy * c + hx * s) * reach);
  }
  ctx.lineTo(x - px * 0.12, y - py * 0.12);
  ctx.closePath();
  ctx.fill();
}

/** A soft oval of light on the road, `along` long in the heading direction and `across` wide. */
function pool(ctx: Ctx, x: number, y: number, hx: number, hy: number, along: number, across: number, color: readonly number[], a: number) {
  ctx.save();
  ctx.transform(hx * along, hy * along, -hy * across, hx * across, x, y);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Where a vehicle's front and rear bars are on the ground, and which way they point. */
function frame(v: Vehicle) {
  const isSemi = v.kind === 'semi';
  // a semi's tail lights are on the trailer, which has its own heading
  const kx = v.x - v.hx * 1.6, ky = v.y - v.hy * 1.6;
  return {
    fx: v.x, fy: v.y, fhx: v.hx, fhy: v.hy,
    rx: isSemi ? kx : v.x, ry: isSemi ? ky : v.y, rhx: isSemi ? v.thx : v.hx, rhy: isSemi ? v.thy : v.hy,
  };
}

/** Beams and tail glow on the road for every vehicle, in one pass. Call with the canvas in screen units. */
export function drawRoadLight(ctx: Ctx, vehicles: readonly Vehicle[]) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  onGround(ctx);
  for (const v of vehicles) {
    const bar = BARS[v.kind];
    if (!bar || v.dead) continue;
    const f = frame(v);
    const [fl, fw] = bar.front;
    const cx = f.fx + f.fhx * fl, cy = f.fy + f.fhy * fl;
    for (const side of [1, -1]) {
      const lx = cx - f.fhy * fw * side, ly = cy + f.fhx * fw * side;
      cone(ctx, lx, ly, f.fhx, f.fhy, bar.reach, 0.3, 0.2);
    }
    pool(ctx, cx + f.fhx * bar.reach * 0.32, cy + f.fhy * bar.reach * 0.32, f.fhx, f.fhy, bar.reach * 0.34, fw + 0.9, BEAM, 0.16);
    const [rl, rw] = bar.rear;
    const ex = f.rx + f.rhx * (rl - 0.7), ey = f.ry + f.rhy * (rl - 0.7);
    pool(ctx, ex, ey, f.rhx, f.rhy, 1.5, rw + 0.6, TAIL, v.braking ? 0.3 : 0.14);
  }
  ctx.restore();
}

function glint(ctx: Ctx, x: number, y: number, z: number, radius: number, color: readonly number[], a: number) {
  const X = (x - y) * C, Y = (x + y) * 0.5 - z;
  const g = ctx.createRadialGradient(X, Y, 0, X, Y, radius);
  g.addColorStop(0, rgba([255, 255, 255], a));
  g.addColorStop(0.25, rgba(color, a * 0.85));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(X, Y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The lamps glinting on the body: the ends of the front bar (part 'front') or the tail lights ('rear'). Only the
 * ones facing the camera, which looks from +x +y.
 */
export function drawLampGlints(r: R, v: Vehicle, part: 'front' | 'rear' | 'both') {
  const bar = BARS[v.kind];
  if (!bar || !r.night) return;
  const ctx = r.ctx;
  const f = frame(v);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (part !== 'rear' && f.fhx + f.fhy > 0) {
    const [l, w, z] = bar.front;
    for (const side of [1, -1]) {
      const x = f.fx + f.fhx * l - f.fhy * (w - 0.06) * side, y = f.fy + f.fhy * l + f.fhx * (w - 0.06) * side;
      glint(ctx, x, y, z, 0.38, BEAM, 0.95);
    }
  }
  if (part !== 'front' && f.rhx + f.rhy < 0) {
    const [l, w, z] = bar.rear;
    for (const side of [1, -1]) {
      const x = f.rx + f.rhx * l - f.rhy * (w - 0.08) * side, y = f.ry + f.rhy * l + f.rhx * (w - 0.08) * side;
      glint(ctx, x, y, z, v.braking ? 0.34 : 0.26, TAIL, v.braking ? 0.95 : 0.7);
    }
  }
  ctx.restore();
}
