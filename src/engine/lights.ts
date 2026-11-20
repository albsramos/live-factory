// Vehicle lights at night: beams thrown onto the road from the ends of each light bar, a red glow behind, and the
// lamps themselves glinting on the body.
//
// The road pass (`drawRoadLight`) runs after the ground and the moving shadows but before anything standing up, so
// a vehicle's own body hides the start of its beams and anything in front of them covers them, as it would.

import { C } from './core';
import type { Ctx, R } from './draw';
import type { Vehicle } from './traffic/vehicle';
import type { VehicleKind } from './traffic/meshes';
import { makeCanvas } from './sprites';

/** Light bar position per kind, from the meshes in vehicles.ts: [distance along the body, half width, height]. */
type Bar = readonly [number, number, number];
/**
 * A light that is one continuous bar wrapping round a vehicle's corners at one end, glowing along its whole length:
 * the plan it follows at height `z` (that end at `l`, half width `w`, corners rounded by `r`).
 */
interface Strip {
  l: number;
  w: number;
  r: number;
  z: number;
}
const BARS: Partial<Record<VehicleKind, { front: Bar; rear: Bar; reach: number; head?: Strip; tail?: Strip }>> = {
  // the bars follow the body's slices: the nose's band from 0.6 to 0.8 and the tailgate's from 0.88 to 1.0 (suvMesh.ts)
  suv: {
    front: [2.42, 0.7, 0.78], rear: [-2.38, 0.72, 0.94], reach: 7,
    head: { l: 2.42, w: 1.0, r: 0.61, z: 0.777 }, tail: { l: -2.36, w: 0.97, r: 0.54, z: 0.955 },
  },
  pickup: { front: [2.85, 0.98, 0.94], rear: [-2.85, 1.0, 1.18], reach: 7.5 },
  // the pod's bars follow its nose (podMesh.ts, the band from 0.42 to 0.62) and its cut-off tail (0.62 to 0.7)
  pod: {
    front: [1.92, 0.62, 0.6], rear: [-1.92, 0.62, 0.66], reach: 5.5,
    head: { l: 1.92, w: 0.955, r: 0.58, z: 0.6 }, tail: { l: -1.92, w: 0.955, r: 0.28, z: 0.66 },
  },
  van: { front: [3.6, 0.55, 1.22], rear: [-3.6, 0.55, 1.22], reach: 7.5 },
  roadster: { front: [2.3, 0.6, 0.51], rear: [-2.3, 0.62, 0.49], reach: 7.5 },
  // the semi's bar runs right across the nose of the cab (tractorMesh.ts, the band from 0.8 to 1.28)
  semi: { front: [3.2, 1.0, 1.24], rear: [-12.8, 1.0, 1.38], reach: 9.5, head: { l: 3.19, w: 1.245, r: 0.6, z: 1.23 } },
};

/** the cool white of LED head lights */
const BEAM = [232, 240, 255] as const;
const TAIL = [255, 64, 52] as const;
const rgba = (c: readonly number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** Map world ground coordinates straight onto the canvas, so shapes can be drawn in metres. */
function onGround(ctx: Ctx) {
  ctx.transform(C, 0.5, -C, 0.5, 0, 0);
}

/** The beam's spread: its half width at the light bar, as a share of its half width at the far end. */
const BEAM_FOOT = 0.18;
let beamImage: HTMLCanvasElement | OffscreenCanvas | null | undefined;

/**
 * The low beam's light on the road, drawn once: a fan that widens ahead and fades smoothly both with distance and
 * towards its edges, brightest a couple of metres in front of the bar. Along the image runs ahead of the bar, across
 * it runs side to side. Null where there is no 2D canvas (tests).
 */
function beamSprite() {
  if (beamImage !== undefined) return beamImage;
  const W = 128, H = 96;
  const c = makeCanvas(W, H), g = c.getContext('2d') as CanvasRenderingContext2D | null;
  if (!g) return (beamImage = null);
  const img = g.createImageData(W, H);
  const smooth = (e0: number, e1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const u = (i + 0.5) / W, v = Math.abs(((j + 0.5) / H) * 2 - 1);
      const half = BEAM_FOOT + (1 - BEAM_FOOT) * Math.pow(u, 0.8);
      const side = 1 - smooth(0.5, 1, v / half);
      const ahead = smooth(0, 0.06, u) * Math.pow(1 - u, 1.7) * (0.6 + 0.4 * Math.exp(-(((u - 0.12) / 0.12) ** 2)));
      const k = (j * W + i) * 4;
      img.data[k] = BEAM[0];
      img.data[k + 1] = BEAM[1];
      img.data[k + 2] = BEAM[2];
      img.data[k + 3] = Math.round(255 * side * ahead);
    }
  }
  g.putImageData(img, 0, 0);
  return (beamImage = c);
}

/** The low beam on the road from a light bar at (x, y) of half width `halfWidth`, reaching `reach` ahead. */
function beam(ctx: Ctx, x: number, y: number, hx: number, hy: number, halfWidth: number, reach: number, a: number) {
  const img = beamSprite();
  if (!img) return;
  const far = halfWidth / BEAM_FOOT;
  ctx.save();
  ctx.transform(hx, hy, -hy, hx, x, y);
  ctx.globalAlpha = a;
  ctx.drawImage(img, 0, -far, reach, 2 * far);
  ctx.restore();
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
    beam(ctx, cx, cy, f.fhx, f.fhy, fw, bar.reach * 1.3, 0.55);
    const [rl, rw] = bar.rear;
    if (bar.tail) {
      // a full-width bar throws a wide band of red on the road behind, broader than the car
      const ex = f.rx + f.rhx * (rl - 1.1), ey = f.ry + f.rhy * (rl - 1.1);
      pool(ctx, ex, ey, f.rhx, f.rhy, 1.7, rw + 1.7, TAIL, v.braking ? 0.46 : 0.3);
      pool(ctx, ex, ey, f.rhx, f.rhy, 0.9, rw + 1.0, TAIL, v.braking ? 0.24 : 0.14);
    } else {
      const ex = f.rx + f.rhx * (rl - 0.7), ey = f.ry + f.rhy * (rl - 0.7);
      pool(ctx, ex, ey, f.rhx, f.rhy, 1.5, rw + 0.6, TAIL, v.braking ? 0.3 : 0.14);
    }
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
    // a bar glows along its whole length; its ends, where it turns the corners, are the head lamps
    if (bar.head) stripGlow(ctx, f.fx, f.fy, f.fhx, f.fhy, bar.head, BEAM, [255, 255, 255], 1);
    const [l, w, z] = bar.front;
    for (const side of [1, -1]) {
      const x = f.fx + f.fhx * l - f.fhy * (w - 0.06) * side, y = f.fy + f.fhy * l + f.fhx * (w - 0.06) * side;
      glint(ctx, x, y, z, bar.head ? 0.3 : 0.38, BEAM, bar.head ? 0.8 : 0.95);
    }
  }
  if (part !== 'front' && bar.tail && f.rhx + f.rhy < 0) stripGlow(ctx, f.rx, f.ry, -f.rhx, -f.rhy, bar.tail, TAIL, [255, 170, 160], v.braking ? 1.35 : 1);
  else if (part !== 'front' && f.rhx + f.rhy < 0) {
    const [l, w, z] = bar.rear;
    for (const side of [1, -1]) {
      const x = f.rx + f.rhx * l - f.rhy * (w - 0.08) * side, y = f.ry + f.rhy * l + f.rhx * (w - 0.08) * side;
      glint(ctx, x, y, z, v.braking ? 0.34 : 0.26, TAIL, v.braking ? 0.95 : 0.7);
    }
  }
  ctx.restore();
}

/**
 * A light bar glowing along its whole length on the body: a soft halo round a thin bright core. (x, y) is the
 * vehicle and (hx, hy) points out of the end the bar is on; `k` brightens it (a braking tail light).
 */
function stripGlow(ctx: Ctx, x: number, y: number, hx: number, hy: number, t: Strip, color: readonly number[], core: readonly number[], k: number) {
  // the bar's path in the body's plan, measured out from the middle towards this end: round one corner, across the
  // end, round the other
  const d = Math.abs(t.l), cl = d - t.r;
  const pts: number[][] = [];
  for (const s of [1, -1]) {
    const arc: number[][] = [];
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      arc.push([cl + Math.sin(a) * t.r, s * (t.w - t.r + Math.cos(a) * t.r)]);
    }
    pts.push(...(s > 0 ? arc : arc.reverse()));
  }
  ctx.beginPath();
  pts.forEach(([l, w], i) => {
    const px = x + hx * l - hy * w, py = y + hy * l + hx * w;
    const X = (px - py) * C, Y = (px + py) * 0.5 - t.z;
    if (i) ctx.lineTo(X, Y);
    else ctx.moveTo(X, Y);
  });
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [width, c, a] of [[0.5, color, 0.16], [0.24, color, 0.4], [0.07, core, 0.9]] as const) {
    ctx.lineWidth = width;
    ctx.strokeStyle = rgba(c, Math.min(1, a * k));
    ctx.stroke();
  }
}
