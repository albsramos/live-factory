// Drawing a walker as a tiny clay figure with a walk cycle: people in plain grey clothes, and humanoid robots with a
// white or champagne shell, a black glass head with a light line round the face, black shoulder straps, waist, hips,
// elbows, knees, hands and feet.

import { C, css, mix, parse } from '../core';
import { box, type Ctx, type R } from '../draw';
import { inShadow } from '../shade';
import type { Walker } from './walker';

/** a colour as it looks in a building's shadow */
const shadeCache = new Map<string, string>();
function shaded(c: string, night: boolean) {
  const k = c + (night ? 'n' : 'd');
  let v = shadeCache.get(k);
  if (!v) shadeCache.set(k, (v = css(mix(parse(c), night ? [0, 0, 0] : [58, 60, 78], night ? 0.3 : 0.16))));
  return v;
}
function pill(ctx: Ctx, x: number, y: number, w: number, h: number, rad: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, rad);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------------------------
// Drawing

/** Draw a walker: legs, arms, body and head, posed by its stance and walk cycle. */
export function drawFigure(r: R, w: Walker) {
  w.recolor();
  if (w.hidden) return;
  const ctx = r.ctx;
  const k = w.size;
  const X = (w.x - w.y) * C, Y = (w.x + w.y) * 0.5 - w.z;
  let dX = (w.hx - w.hy) * C, dY = (w.hx + w.hy) * 0.5;
  const dl = Math.hypot(dX, dY) || 1;
  dX /= dl;
  dY /= dl;
  const robot = w.kind === 'robot';
  const t = r.t + w.seed;
  const sw = w.moving ? Math.sin(w.phase) : 0;
  const bob = w.moving ? Math.abs(Math.cos(w.phase)) * 0.035 * k : 0;
  const sway = w.stance === 'chat' ? Math.sin(t * 0.9) * 0.025 : 0;
  const sit = w.stance === 'sit';
  const hip = sit ? 0.5 * k : 0.9 * k;
  const hipY = Y - hip - bob;
  const pX = -dY * 0.07 * k, pY = dX * 0.035 * k; // a little apart, sideways
  const stride = (robot ? 0.27 : 0.3) * k;
  const carryFront = w.hx + w.hy > 0;
  // standing in a building's shadow
  const dim = !!r.casters && inShadow(w.x, w.y, w.z + 1.2 * k, r.casters);
  const tone = (c: string) => (dim ? shaded(c, r.night) : c);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // legs (a robot's far leg in the shade of its shell, its feet black)
  const feet: number[][] = [];
  const knees: number[][] = [];
  ctx.strokeStyle = tone(w.legs);
  ctx.lineWidth = 0.15 * k;
  ctx.beginPath();
  if (sit) {
    for (const s of [1, -1]) {
      const kx = X + s * pX + dX * 0.42 * k, ky = hipY + s * pY + dY * 0.42 * k * 0.5;
      ctx.moveTo(X + s * pX, hipY + s * pY);
      ctx.lineTo(kx, ky);
      ctx.lineTo(kx + dX * 0.05 * k, ky + 0.45 * k);
      feet.push([kx + dX * 0.05 * k, ky + 0.45 * k]);
    }
  } else {
    // far leg first
    for (const s of pY > 0 ? [-1, 1] : [1, -1]) {
      const a = sw * stride * s;
      const hx = X + s * pX + sway, hy = hipY + s * pY;
      const fx = X + s * pX + dX * a, fy = Y + s * pY + dY * a * 0.6;
      if (robot) {
        ctx.stroke();
        ctx.strokeStyle = tone(s * pY > 0 ? w.legs : w.bodyShade);
        ctx.beginPath();
      }
      ctx.moveTo(hx, hy);
      if (robot) {
        // the knee leads a little, more on the swinging leg
        const bend = (0.03 + 0.04 * Math.max(0, sw * s)) * k;
        const kx = (hx + fx) / 2 + dX * bend, ky = (hy + fy) / 2 + dY * bend * 0.5;
        ctx.lineTo(kx, ky);
        knees.push([kx, ky]);
        feet.push([fx, fy]);
      }
      ctx.lineTo(fx, fy);
    }
  }
  ctx.stroke();
  if (robot) {
    drawFeet(w, ctx, feet, dX, dY, tone);
    joints(w, ctx, knees, 0.045, tone);
  }

  const shY = Y - (sit ? 0.9 : 1.38) * k - bob;
  const tX = X + sway * 2;
  // the box sits in front of the chest; behind the body when walking away from the camera
  if (w.carry && !carryFront) drawCarry(w, r);
  // arms
  ctx.strokeStyle = tone(w.arm);
  ctx.lineWidth = (robot ? 0.1 : 0.11) * k;
  ctx.beginPath();
  const work = w.stance === 'work';
  const hands: number[][] = [];
  for (const s of [1, -1]) {
    const sx0 = tX + s * 0.2 * k * Math.abs(dY) + s * 0.08 * k, sy0 = shY + 0.04 * k;
    let hx: number, hy: number;
    if (w.carry) {
      hx = tX + dX * 0.28 * k + s * 0.12 * k;
      hy = shY + 0.32 * k + dY * 0.1 * k;
    } else if (work) {
      const reach = 0.38 + 0.12 * Math.sin(t * 2.2 + s * 1.7);
      hx = sx0 + dX * reach * k;
      hy = sy0 + 0.22 * k + dY * reach * k * 0.6 - 0.06 * Math.max(0, Math.sin(t * 2.2 + s)) * k;
    } else if (w.stance === 'chat') {
      const g = Math.max(0, Math.sin(t * 0.7 + s * 2)) * 0.25;
      hx = sx0 + dX * g * k;
      hy = sy0 + (0.5 - g) * k;
    } else {
      const a = -sw * 0.2 * k * s;
      hx = sx0 + dX * a;
      hy = sy0 + 0.52 * k + dY * a * 0.5;
    }
    ctx.moveTo(sx0, sy0);
    ctx.lineTo(hx, hy);
    hands.push([hx, hy]);
  }
  ctx.stroke();
  if (robot) {
    // black hands, and black elbows halfway down
    joints(w, ctx, hands, 0.055, tone);
    joints(w, ctx, hands.map(([hx, hy], i) => [(hx + tX + (i ? -1 : 1) * (0.2 * k * Math.abs(dY) + 0.08 * k)) / 2, (hy + shY + 0.04 * k) / 2]), 0.038, tone);
  }

  // torso
  if (robot) {
    drawShell(w, r, tX, shY - 0.04 * k, Y - hip - bob + 0.02 * k, dX, dY, tone);
  } else {
    ctx.strokeStyle = tone(w.body);
    ctx.lineWidth = 0.4 * k;
    ctx.beginPath();
    ctx.moveTo(tX, Y - hip - bob - 0.13 * k);
    ctx.lineTo(tX, shY + 0.05 * k);
    ctx.stroke();
    ctx.strokeStyle = tone(w.bodyShade);
    ctx.lineWidth = 0.12 * k;
    ctx.beginPath();
    ctx.moveTo(tX + 0.12 * k, Y - hip - bob - 0.1 * k);
    ctx.lineTo(tX + 0.12 * k, shY + 0.08 * k);
    ctx.stroke();
    ctx.fillStyle = tone(w.head);
    ctx.beginPath();
    ctx.arc(tX, shY - 0.26 * k, 0.14 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  if (w.carry && carryFront) drawCarry(w, r);
}

/** A robot's black joints (hands, elbows, knees): a dot of `rad` (in figure sizes) at each point. */
function joints(w: Walker, ctx: Ctx, pts: number[][], rad: number, tone: (c: string) => string) {
  ctx.fillStyle = tone(w.pal.bot.dark);
  for (const [x, y] of pts) {
    ctx.beginPath();
    ctx.arc(x, y, rad * w.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Black feet, pointing the way the robot faces. */
function drawFeet(w: Walker, ctx: Ctx, pts: number[][], dX: number, dY: number, tone: (c: string) => string) {
  const k = w.size;
  ctx.strokeStyle = tone(w.pal.bot.dark);
  ctx.lineWidth = 0.1 * k;
  ctx.beginPath();
  for (const [x, y] of pts) {
    ctx.moveTo(x - dX * 0.04 * k, y - dY * 0.02 * k);
    ctx.lineTo(x + dX * 0.1 * k, y + dY * 0.05 * k);
  }
  ctx.stroke();
}

/**
 * A humanoid robot's body: a chest plate in its shell colour, shaded on its far side, under black shoulder straps; a
 * black waist and hips; and a head of black glass with a thin light line round the face, seen from the front.
 */
function drawShell(w: Walker, r: R, tX: number, top: number, bot: number, dX: number, dY: number, tone: (c: string) => string) {
  const ctx = r.ctx, k = w.size, bot2 = w.pal.bot;
  const waist0 = top + (bot - top) * 0.55, waist1 = top + (bot - top) * 0.75;
  const w0 = 0.24 * k, w1 = 0.15 * k, wp = 0.17 * k;
  const quad = (x0: number, x1: number, y0: number, x2: number, x3: number, y1: number) => {
    ctx.beginPath();
    ctx.moveTo(tX + x0, y0);
    ctx.lineTo(tX + x1, y0);
    ctx.lineTo(tX + x2, y1);
    ctx.lineTo(tX + x3, y1);
    ctx.closePath();
    ctx.fill();
  };
  // chest, then its shaded side
  ctx.fillStyle = tone(w.body);
  quad(-w0, w0, top, w1, -w1, waist0);
  ctx.fillStyle = tone(w.bodyShade);
  quad(w0 * 0.45, w0, top, w1, w1 * 0.4, waist0);
  // black straps over the shoulders along the top of the chest, a black waist and black hips
  ctx.fillStyle = tone(bot2.dark);
  quad(-w0, w0, top, w0 * 0.97, -w0 * 0.97, top + 0.05 * k);
  quad(-w1, w1, waist0 - 0.01 * k, w1 * 0.95, -w1 * 0.95, waist1);
  quad(-wp, wp, waist1, wp * 0.85, -wp * 0.85, bot);
  // neck
  ctx.fillStyle = tone(bot2.dark);
  ctx.fillRect(tX - 0.05 * k, top - 0.09 * k, 0.1 * k, 0.1 * k);
  // head, with a glint on the face (turned with the heading; none from behind)
  const hy = top - 0.24 * k;
  ctx.fillStyle = tone(bot2.dark);
  pill(ctx, tX - 0.11 * k, hy - 0.14 * k, 0.22 * k, 0.27 * k, 0.1 * k);
  if (dY > -0.3) {
    ctx.strokeStyle = bot2.glint;
    ctx.lineWidth = 0.028 * k;
    ctx.beginPath();
    ctx.arc(tX + dX * 0.04 * k, hy, 0.085 * k, Math.PI * 0.75, Math.PI * 1.7);
    ctx.stroke();
  }
}

function drawCarry(w: Walker, r: R) {
  const s = 0.24 * w.size;
  const cx = w.x + w.hx * 0.34, cy = w.y + w.hy * 0.34, cz = w.z + 0.95 * w.size;
  box(r, cx - s, cy - s, cz, cx + s, cy + s, cz + s * 1.5, w.pal.crate);
}
