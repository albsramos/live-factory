// Lamps along the park paths: a slim post with a lantern on top, lower than the street lamps. At night the lantern
// glows and throws a warm pool of light on the ground (painted into the cached ground layer, which is baked again on
// a theme change). Each stands a step to the side of its path, clear of the people walking it.

import type { Env } from '../activities/activity';
import { C } from '../core';
import type { Ctx, R } from '../draw';
import { blobShadow } from '../ground';
import { FnItem } from '../statics';

const H = 2.9;
const LAMPS = [
  // the staff park: along the main path, round the pond, up to the lake and round its east side
  [114.6, 31.1], [127.5, 25.0], [121.3, 22.8], [129.6, 8.4], [118.4, 8.4], [118.4, -0.4], [129.6, -0.4],
  [127.2, -13.4], [131, -18.6], [135.9, -33],
  // the café's lawn: along the garden walk and by the café's path
  [95, 69.6], [118, 67.4], [129.4, 80], [107.9, 62.0],
  // the north belt's path, and the corners of the stunt pad
  [52, -45.7], [64, -45.7], [84, -45.7], [116, -45.7], [130, -45.7], [82.4, -48.6], [103.6, -65.5],
];

function lamp(r: R, x: number, y: number, env: Env) {
  const { pal } = env;
  const ctx = r.ctx;
  const X = (x - y) * C, Y = (x + y) * 0.5;
  ctx.strokeStyle = pal.steel.right;
  ctx.lineWidth = 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(X, Y);
  ctx.lineTo(X, Y - H);
  ctx.stroke();
  // the lantern: a small glass box under a cap
  ctx.fillStyle = r.night ? '#ffe2a8' : pal.white.top;
  ctx.fillRect(X - 0.13, Y - H - 0.32, 0.26, 0.32);
  ctx.fillStyle = pal.steel.right;
  ctx.fillRect(X - 0.17, Y - H - 0.4, 0.34, 0.08);
  if (r.night) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(X, Y - H - 0.15, 0, X, Y - H - 0.15, 1.6);
    g.addColorStop(0, 'rgba(255, 214, 150, 0.45)');
    g.addColorStop(1, 'rgba(255, 214, 150, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(X - 1.6, Y - H - 1.75, 3.2, 3.2);
    ctx.restore();
  }
}

export function buildParkLamps(env: Env) {
  for (const [x, y] of LAMPS) {
    env.statics.push(new FnItem(x - 0.12, y - 0.12, 0, x + 0.12, y + 0.12, H + 0.4, (r) => lamp(r, x, y, env), (ctx) => blobShadow(ctx, x + 0.6, y - 0.3, 0.1, 2.2)));
  }
  /** at night, a warm pool of light on the ground under each lamp */
  const ground = (ctx: Ctx) => {
    if (!env.pal.night) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y] of LAMPS) {
      const X = (x - y) * C, Y = (x + y) * 0.5;
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(1, 0.5);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 4.2);
      g.addColorStop(0, 'rgba(255, 205, 140, 0.20)');
      g.addColorStop(1, 'rgba(255, 205, 140, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(-4.2, -4.2, 8.4, 8.4);
      ctx.restore();
    }
    ctx.restore();
  };
  return { ground };
}
