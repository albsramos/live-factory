// The opt-in branding on the factory (the `isBranded` prop): the scene otherwise shows no text or brand marks. Five
// wide-set letters on the panel band over the ribbon window above the main entrance, drawn as simple geometric
// strokes (no font), dark on the light clay by day and glowing white at night; and a neon signature on the dark wall
// inside the entrance.

import type { Ctx, R } from '../draw';
import type { Palette } from '../palette';

/** Whether the lettering shows: shared by the scene and the factory, so it can change without a rebuild. */
export interface Branding {
  isOn: boolean;
}

/** a letter's height and width, and the stroke's thickness, in metres */
const H = 1.2, W = 1.45, T = 0.22;
/** each letter as rectangles [u, v, width, height] within its W × H cell */
const GLYPHS: number[][][] = [
  // T: a bar across the top, a stem standing just clear of it
  [[0, 0, W, 0.18], [W / 2 - T / 2, 0.28, T, H - 0.28]],
  // E: three bars
  [[0, 0, W, 0.18], [0, (H - 0.18) / 2, W, 0.18], [0, H - 0.18, W, 0.18]],
  // S: top bar, down the left, across the middle, down the right, bottom bar
  [[0, 0, W, 0.18], [0, 0, T, (H + 0.18) / 2], [0, (H - 0.18) / 2, W, 0.18], [W - T, (H - 0.18) / 2, T, (H + 0.18) / 2], [0, H - 0.18, W, 0.18]],
  // L
  [[0, 0, T, H], [0, H - 0.18, W, 0.18]],
  // A: a bar over an arch
  [[0, 0, W, 0.16], [0, 0.3, W, 0.18], [0, 0.3, T, H - 0.3], [W - T, 0.3, T, H - 0.3]],
];
/** the gap between letters */
const GAP = 2.2;

/**
 * The letters on a face, in the face's own frame (u along it, v down from its top, as `onFaceX` gives): centred on
 * `mid` along the face, their tops at `top`.
 */
export function drawLettering(r: R, pal: Palette, ctx: Ctx, mid: number, top: number) {
  const span = GLYPHS.length * W + (GLYPHS.length - 1) * GAP;
  ctx.save();
  ctx.fillStyle = pal.sign;
  if (r.night) {
    // lit from within: a soft white glow round each letter
    ctx.shadowColor = pal.signGlow;
    ctx.shadowBlur = r.scale * 0.35;
  }
  GLYPHS.forEach((glyph, i) => {
    const u0 = mid - span / 2 + i * (W + GAP);
    for (const [u, v, w, h] of glyph) ctx.fillRect(u0 + u, top + v, w, h);
  });
  ctx.restore();
}

/**
 * The neon signature on the dark wall in the entrance, as points (u, v) in shares of the wall's width and height: low
 * on the wall, where it shows under the floor above.
 */
const NEON = [
  [0.1, 0.8], [0.16, 0.64], [0.2, 0.78], [0.24, 0.84], [0.3, 0.67], [0.34, 0.78], [0.4, 0.69], [0.46, 0.8],
  [0.52, 0.65], [0.56, 0.78], [0.62, 0.7], [0.7, 0.72], [0.76, 0.64], [0.8, 0.8], [0.86, 0.7], [0.9, 0.67],
];

/** The neon signature, on a wall of width `w` and height `h` (in the wall's own frame): cyan, glowing at night. */
export function drawNeon(r: R, pal: Palette, ctx: Ctx, w: number, h: number) {
  ctx.save();
  ctx.beginPath();
  NEON.forEach(([u, v], i) => (i ? ctx.lineTo(u * w, v * h) : ctx.moveTo(u * w, v * h)));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = pal.glow;
  ctx.lineWidth = 0.09;
  ctx.shadowColor = pal.glow;
  ctx.shadowBlur = r.scale * (r.night ? 0.4 : 0.15);
  ctx.stroke();
  ctx.restore();
}
