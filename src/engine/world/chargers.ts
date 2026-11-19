// The charging bay's chargers: a row of slim white posts with rounded tops on black bases, each with its black cable
// looped on its side (no lettering: the scene shows no brand marks). While a semi charges in the bay, the nearest
// post's cable runs to the cab's charge port, pulses of light travel along it into the truck, the port glows and the
// post's light breathes green.

import { C } from '../core';
import { box, onFaceY, type R } from '../draw';
import { boxShadow } from '../ground';
import type { Palette } from '../palette';
import { FnItem } from '../statics';
import type { Dock } from '../activities/truckYard';

const HW = 0.46, HD = 0.11, H = 2.3;

/** One post at (px, py), its face towards +y (the camera). */
function post(r: R, pal: Palette, px: number, py: number, isLive: boolean) {
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
    // the light near the top: breathing green while charging, a dim strip otherwise
    const a = isLive ? 0.55 + 0.45 * Math.sin(r.t * 2.6) : 1;
    ctx.globalAlpha = a;
    ctx.fillStyle = isLive ? pal.led : pal.night ? '#3a3c44' : '#dcdde3';
    ctx.fillRect(w / 2 - 0.12, top + 0.32, 0.24, 0.035);
    ctx.globalAlpha = 1;
    // its cable, hung in a loop down the right side (unless it is plugged into the truck)
    if (!isLive) {
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
 * The cable from the post's side to the cab's charge port, sagging towards the ground, with pulses of light running
 * along it into the truck and a glow at the port.
 */
function cable(r: R, pal: Palette, from: [number, number, number], to: [number, number, number]) {
  const ctx = r.ctx;
  const S = (p: [number, number, number]) => [(p[0] - p[1]) * C, (p[0] + p[1]) * 0.5 - p[2]] as const;
  const [ax, ay] = S(from), [bx, by] = S(to);
  const [cx, cy] = S([(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0.15]);
  ctx.strokeStyle = '#141519';
  ctx.lineWidth = 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(cx, cy, bx, by);
  ctx.stroke();
  const at = (t: number) => [(1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx, (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by];
  const glow = r.night ? 1 : 0.7;
  ctx.fillStyle = pal.led;
  for (let k = 0; k < 4; k++) {
    const t = (k / 4 + r.t * 0.55) % 1;
    const [x, y] = at(t);
    ctx.globalAlpha = 0.35 * glow;
    ctx.beginPath();
    ctx.arc(x, y, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = glow;
    ctx.beginPath();
    ctx.arc(x, y, 0.085, 0, Math.PI * 2);
    ctx.fill();
  }
  // the port
  const p = 0.6 + 0.4 * Math.sin(r.t * 3.1);
  ctx.globalAlpha = 0.3 * p * glow;
  ctx.beginPath();
  ctx.arc(bx, by, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = glow;
  ctx.beginPath();
  ctx.arc(bx, by, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * A row of posts along y = py, on the island beside the charging bay. The last post (nearest the cab) serves the
 * bay: a semi backed in has its charge port at `port`, just beyond that post's right side so the whole cable shows.
 * One item for the row and the cable, kept clear of the cab's box (which ends before `port`'s y), so it always sorts
 * in front of the truck.
 */
export function chargerRow(pal: Palette, xs: number[], py: number, port: [number, number, number], bay: Dock) {
  const last = xs.length - 1;
  const x0 = Math.min(port[0], xs[0] - HW) - 0.1, x1 = Math.max(port[0], xs[last] + HW) + 0.1;
  return new FnItem(
    x0, port[1], 0, x1, py + HD + 0.05, H,
    (r) => {
      xs.forEach((x, i) => post(r, pal, x, py, i === last && bay.loading));
      if (bay.loading) cable(r, pal, [xs[last] + HW, py, 1.2], port);
    },
    (ctx) => {
      for (const x of xs) boxShadow(ctx, x - HW, py - HD, x + HW, py + HD, H);
    },
  );
}
