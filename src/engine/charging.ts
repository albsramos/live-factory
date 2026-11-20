// Chargers: slim white posts with rounded tops on black bases, each with its black cable looped on its side (no
// lettering: the scene shows no brand marks), and the cable that runs to a vehicle's charge port and glows green
// along its whole length while it charges. Used by the truck yard and every car park.

import { C } from './core';
import { box, onFaceY, type R } from './draw';
import type { Palette } from './palette';

/** half width, half depth and height of a post */
export const HW = 0.46, HD = 0.11, H = 2.3;

/** `idle`: nothing plugged in, cable hung on the post; `charging`: plugged in and charging. */
export type ChargerState = 'idle' | 'charging';

/** One post at (px, py), its face towards +y (the camera). */
export function drawChargerPost(r: R, pal: Palette, px: number, py: number, state: ChargerState) {
  const isLive = state === 'charging';
  const x0 = px - HW, x1 = px + HW, y0 = py - HD, y1 = py + HD;
  box(r, x0 - 0.04, y0 - 0.04, 0, x1 + 0.04, y1 + 0.04, 0.32, pal.dark);
  box(r, x0, y0, 0.32, x1, y1, H, pal.dark);
  onFaceY(r, x0, x1, y1, H, (ctx, w) => {
    // the white shell: rounded top, straight sides, a soft curve at the foot
    const m = 0.03, top = 0.04, bot = H - 0.4, rad = (w - 2 * m) / 2;
    ctx.fillStyle = pal.night ? '#c9cbd3' : '#fbfbfd';
    ctx.beginPath();
    ctx.moveTo(m, top + rad);
    ctx.arc(m + rad, top + rad, rad, Math.PI, 0);
    ctx.lineTo(w - m, bot);
    ctx.quadraticCurveTo(w / 2, bot + 0.22, m, bot);
    ctx.closePath();
    ctx.fill();
    // the light near the top: breathing green while charging, a dim strip while idle
    const a = isLive ? 0.55 + 0.45 * Math.sin(r.t * 2.6) : 1;
    ctx.globalAlpha = a;
    ctx.fillStyle = state === 'idle' ? (pal.night ? '#3a3c44' : '#dcdde3') : pal.led;
    ctx.fillRect(w / 2 - 0.12, top + 0.32, 0.24, 0.035);
    ctx.globalAlpha = 1;
    // its cable, hung in a loop down the right side (unless it is plugged into the truck)
    if (state === 'idle') {
      ctx.strokeStyle = '#141519';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(w - m - 0.02, top + 0.9);
      ctx.bezierCurveTo(w + 0.12, top + 1.25, w + 0.02, bot + 0.15, w / 2 + 0.05, bot + 0.05);
      ctx.stroke();
    }
  });
}

/**
 * A cable from the post's side to a vehicle's charge port, sagging towards the ground. A plugged-in vehicle is
 * always charging, so the whole cable glows green, breathing gently, with a glow at the port.
 */
export function drawChargeCable(r: R, pal: Palette, from: readonly number[], to: readonly number[]) {
  const ctx = r.ctx;
  const S = (p: readonly number[]) => [(p[0] - p[1]) * C, (p[0] + p[1]) * 0.5 - p[2]] as const;
  const [ax, ay] = S(from), [bx, by] = S(to);
  const [cx, cy] = S([(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0.15]);
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(cx, cy, bx, by);
  };
  ctx.lineCap = 'round';
  trace();
  const glow = (r.night ? 1 : 0.75) * (0.75 + 0.25 * Math.sin(r.t * 2.2 + from[0]));
  // a soft halo, then the cable itself lit green along its whole length
  ctx.strokeStyle = pal.led;
  ctx.globalAlpha = 0.3 * glow;
  ctx.lineWidth = 0.32;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#141519';
  ctx.lineWidth = 0.1;
  ctx.stroke();
  ctx.strokeStyle = pal.led;
  ctx.globalAlpha = glow;
  ctx.lineWidth = 0.06;
  ctx.stroke();
  // the port
  ctx.fillStyle = pal.led;
  ctx.globalAlpha = 0.3 * glow;
  ctx.beginPath();
  ctx.arc(bx, by, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = glow;
  ctx.beginPath();
  ctx.arc(bx, by, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
