// Surface details drawn onto building faces and roofs: window ribbons, solar fields, server fronts, battery doors.

import type { Ctx, R } from './draw';
import { onFaceX, onFaceY, onTop } from './draw';
import type { Palette } from './palette';

const gradCache = new WeakMap<Palette, Map<string, CanvasGradient>>();

function vgrad(ctx: Ctx, pal: Palette, key: string, top: number, bot: number, c0: string, c1: string) {
  let m = gradCache.get(pal);
  if (!m) gradCache.set(pal, (m = new Map()));
  // the colours are in the key: a theme change recolours this palette in place
  const k = `${key}:${top}:${bot}:${c0}:${c1}`;
  let g = m.get(k);
  if (!g) {
    g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    m.set(k, g);
  }
  return g;
}

export interface Band {
  /** distance down from the top of the face */
  top: number;
  bot: number;
  /** mullion spacing */
  every?: number;
  /** horizontal spans [from, to] along the face; whole width if omitted */
  spans?: number[][];
  dark?: boolean;
}

/** Warm glazing in horizontal bands, with mullions. Call inside a face transform. */
export function ribbons(r: R, pal: Palette, ctx: Ctx, w: number, bands: Band[]) {
  const [c0, c1] = r.night ? pal.windowNight : pal.window;
  for (const b of bands) {
    const spans = b.spans ?? [[0.5, w - 0.5]];
    ctx.fillStyle = b.dark ? pal.glassDark : vgrad(ctx, pal, 'win', b.top, b.bot, c0, c1);
    for (const [a, z] of spans) ctx.fillRect(a, b.top, z - a, b.bot - b.top);
    const every = b.every ?? 1.4;
    ctx.beginPath();
    for (const [a, z] of spans) {
      for (let u = a + every; u < z - 0.05; u += every) {
        ctx.moveTo(u, b.top);
        ctx.lineTo(u, b.bot);
      }
      ctx.moveTo(a, b.top + (b.bot - b.top) * 0.32);
      ctx.lineTo(z, b.top + (b.bot - b.top) * 0.32);
    }
    ctx.strokeStyle = pal.mullion;
    ctx.lineWidth = 0.07;
    ctx.stroke();
  }
}

/** Night glow spilling from the windows: a soft bloom around each lit band. */
export function windowGlow(r: R, ctx: Ctx, w: number, bands: Band[]) {
  if (!r.night) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // shadowBlur is in canvas pixels, whatever the face transform does
  ctx.shadowColor = 'rgba(255, 170, 84, 0.8)';
  ctx.shadowBlur = 0.7 * r.scale;
  ctx.fillStyle = 'rgba(255, 196, 120, 0.16)';
  for (const b of bands) {
    if (b.dark) continue;
    for (const [a, z] of b.spans ?? [[0.5, w - 0.5]]) ctx.fillRect(a - 0.12, b.top - 0.12, z - a + 0.24, b.bot - b.top + 0.24);
  }
  ctx.restore();
}

/**
 * A tall glazed atrium on a +x face, floor to near the roof: warm glass in a mullion grid, with a soft daylight
 * reflection (or a glow at night). `u0`…`u1` run along the face, `top`…`bot` down from its top edge.
 */
export function atrium(r: R, pal: Palette, x1: number, y0: number, y1: number, z1: number, u0: number, u1: number, top: number, bot: number) {
  onFaceX(r, x1, y0, y1, z1, (ctx) => {
    const [c0, c1] = r.night ? pal.windowNight : pal.window;
    const w = u1 - u0, h = bot - top;
    ctx.fillStyle = vgrad(ctx, pal, 'atrium', top, bot, c0, c1);
    ctx.fillRect(u0, top, w, h);
    // daylight sliding down the glass in two soft diagonal bands
    if (!r.night) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(u0, top, w, h);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath();
      ctx.moveTo(u0 + w * 0.18, top);
      ctx.lineTo(u0 + w * 0.42, top);
      ctx.lineTo(u0 + w * 0.02, bot);
      ctx.lineTo(u0 - w * 0.22, bot);
      ctx.closePath();
      ctx.moveTo(u0 + w * 0.55, top);
      ctx.lineTo(u0 + w * 0.63, top);
      ctx.lineTo(u0 + w * 0.23, bot);
      ctx.lineTo(u0 + w * 0.15, bot);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // mullions, and heavier floor slabs every few panes
    ctx.strokeStyle = pal.mullion;
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    const cols = Math.max(2, Math.round(w / 1.1));
    for (let i = 1; i < cols; i++) {
      const u = u0 + (w * i) / cols;
      ctx.moveTo(u, top);
      ctx.lineTo(u, bot);
    }
    for (let v = top + 1.1; v < bot - 0.3; v += 1.1) {
      ctx.moveTo(u0, v);
      ctx.lineTo(u1, v);
    }
    ctx.stroke();
    ctx.lineWidth = 0.16;
    ctx.strokeStyle = r.night ? 'rgba(30,22,14,0.55)' : 'rgba(150,132,104,0.45)';
    ctx.beginPath();
    for (let v = top + 2.2; v < bot - 0.6; v += 2.2) {
      ctx.moveTo(u0, v);
      ctx.lineTo(u1, v);
    }
    ctx.stroke();
    // a slim frame round the opening
    ctx.strokeStyle = r.night ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.12;
    ctx.strokeRect(u0, top, w, h);
    windowGlow(r, ctx, u1, [{ top, bot, spans: [[u0, u1]] }]);
  });
}

export function windowsX(r: R, pal: Palette, x1: number, y0: number, y1: number, z1: number, bands: Band[]) {
  onFaceX(r, x1, y0, y1, z1, (ctx, w) => {
    ribbons(r, pal, ctx, w, bands);
    windowGlow(r, ctx, w, bands);
  });
}

export function windowsY(r: R, pal: Palette, x0: number, x1: number, y1: number, z1: number, bands: Band[]) {
  onFaceY(r, x0, x1, y1, z1, (ctx, w) => {
    ribbons(r, pal, ctx, w, bands);
    windowGlow(r, ctx, w, bands);
  });
}

/**
 * A roof covered with solar glass. With `strip` > 0 the panels come in
 * rows of that depth with walkways between them, like a factory roof.
 */
export function solarRoof(r: R, pal: Palette, x0: number, y0: number, x1: number, y1: number, z: number, inset = 0.5, strip = 0) {
  const w = x1 - x0, d = y1 - y0;
  onTop(r, x0, y0, z, (ctx) => {
    ctx.fillStyle = pal.solar;
    const cell = 1.05;
    ctx.beginPath();
    if (strip > 0) {
      const gap = 0.75;
      for (let q = inset; q < d - inset - 0.5; q += strip + gap) ctx.rect(inset, q, w - inset * 2, Math.min(strip, d - inset - q));
      ctx.fill();
      ctx.beginPath();
      for (let q = inset; q < d - inset - 0.5; q += strip + gap) {
        const h = Math.min(strip, d - inset - q);
        for (let p = inset + cell; p < w - inset - 0.1; p += cell) {
          ctx.moveTo(p, q);
          ctx.lineTo(p, q + h);
        }
        ctx.moveTo(inset, q + h / 2);
        ctx.lineTo(w - inset, q + h / 2);
      }
    } else {
      ctx.fillRect(inset, inset, w - inset * 2, d - inset * 2);
      for (let p = inset + cell; p < w - inset - 0.1; p += cell) {
        ctx.moveTo(p, inset);
        ctx.lineTo(p, d - inset);
      }
      for (let q = inset + 1.7; q < d - inset - 0.1; q += 1.7) {
        ctx.moveTo(inset, q);
        ctx.lineTo(w - inset, q);
      }
    }
    ctx.strokeStyle = pal.solarLine;
    ctx.lineWidth = 0.06;
    ctx.stroke();
  });
}

const H = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Server rack fronts (a +y face): the dark panel and unit dividers. */
export function rackFront(r: R, pal: Palette, x0: number, x1: number, y1: number, z0: number, z1: number) {
  onFaceY(r, x0, x1, y1, z1, (ctx, w) => {
    const h = z1 - z0;
    ctx.fillStyle = pal.rackFront;
    ctx.fillRect(0.06, 0.08, w - 0.12, h - 0.12);
    const n = Math.floor((w - 0.1) / RACK_UNIT);
    ctx.beginPath();
    for (let i = 1; i < n; i++) {
      ctx.moveTo(0.05 + i * RACK_UNIT, 0.08);
      ctx.lineTo(0.05 + i * RACK_UNIT, h - 0.05);
    }
    ctx.strokeStyle = pal.night ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.05;
    ctx.stroke();
  });
}

const RACK_UNIT = 0.62;

/** Blinking status lights on a rack front. */
export function rackLeds(r: R, pal: Palette, x0: number, x1: number, y1: number, z1: number, seed: number) {
  onFaceY(r, x0, x1, y1, z1, (ctx, w) => {
    const n = Math.floor((w - 0.1) / RACK_UNIT);
    const tick = Math.floor(r.t * 3.2);
    for (const blue of [false, true]) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < 7; j++) {
          const hsh = H(i + seed * 13, j + tick * (0.3 + H(i, j) * 0.7));
          if (hsh < 0.45 || hsh > 0.86 !== blue) continue;
          ctx.rect(0.14 + i * RACK_UNIT + (j % 2) * 0.2, 0.3 + j * 0.26, 0.12, 0.06);
        }
      }
      ctx.fillStyle = blue ? pal.ledBlue : pal.led;
      ctx.fill();
    }
  });
}

/** Battery cabinet doors and a breathing status light (a +y face). */
export function batteryFront(r: R, pal: Palette, x0: number, x1: number, y1: number, z1: number) {
  onFaceY(r, x0, x1, y1, z1, (ctx, w) => {
    ctx.beginPath();
    const doors = 6;
    for (let i = 1; i < doors; i++) {
      const u = (w / doors) * i;
      ctx.moveTo(u, 0.22);
      ctx.lineTo(u, 2.55);
    }
    ctx.moveTo(0.1, 0.2);
    ctx.lineTo(w - 0.1, 0.2);
    ctx.strokeStyle = pal.night ? 'rgba(0,0,0,0.35)' : 'rgba(110,112,126,0.30)';
    ctx.lineWidth = 0.05;
    ctx.stroke();
    // vents
    ctx.fillStyle = pal.night ? 'rgba(0,0,0,0.35)' : 'rgba(90,92,104,0.22)';
    for (let i = 0; i < doors; i++) ctx.fillRect((w / doors) * i + 0.25, 0.38, w / doors - 0.5, 0.14);
  });
}

/** The breathing status light on a battery cabinet. */
export function batteryLed(r: R, pal: Palette, x0: number, x1: number, y1: number, z1: number, seed: number) {
  onFaceY(r, x0, x1, y1, z1, (ctx, w) => {
    const p = 0.5 + 0.5 * Math.sin(r.t * 1.6 + seed * 2.1);
    ctx.globalAlpha = 0.35 + 0.65 * p;
    ctx.fillStyle = pal.led;
    ctx.fillRect(w - 0.62, 0.62, 0.32, 0.07);
    ctx.globalAlpha = 1;
  });
}

/** A lit facade at night: the foot of a face from (x0, y0) to (x1, y1), and the way it faces (nx, ny). */
export type LitFace = readonly [x0: number, y0: number, x1: number, y1: number, nx: number, ny: number];

/**
 * Warm light from the windows falling on the ground in front of each lit facade (night only). Drawn into the cached
 * ground layer, so it costs nothing per frame.
 */
export function windowSpill(ctx: Ctx, faces: readonly LitFace[], reach = 4.5) {
  const C = 0.8660254037844386;
  ctx.save();
  // draw in ground metres
  ctx.transform(C, 0.5, -C, 0.5, 0, 0);
  for (const [x0, y0, x1, y1, nx, ny] of faces) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const g = ctx.createLinearGradient(mx, my, mx + nx * reach, my + ny * reach);
    g.addColorStop(0, 'rgba(255, 186, 104, 0.2)');
    g.addColorStop(0.45, 'rgba(255, 186, 104, 0.07)');
    g.addColorStop(1, 'rgba(255, 186, 104, 0)');
    ctx.fillStyle = g;
    // a little wider than the face, so the pool fades out round the corners
    const tx = x1 - x0, ty = y1 - y0, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1 + nx * reach + ux * 1.5, y1 + ny * reach + uy * 1.5);
    ctx.lineTo(x0 + nx * reach - ux * 1.5, y0 + ny * reach - uy * 1.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
