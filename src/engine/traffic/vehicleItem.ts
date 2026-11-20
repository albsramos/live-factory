// Drawing a vehicle: the mesh, doors, the forklift's mast and the semi's trailer (its curtain side and cargo).

import { C, type Mat } from '../core';
import { drawMesh } from '../mesh';
import { fillQuad, type R } from '../draw';
import { drawLampGlints } from '../lights';
import type { Item } from '../sort';
import { MESH } from './meshes';
import type { Vehicle } from './vehicle';
import { drawJets } from './exhaust';
import { ROLL_Z } from './hop';

/** After a theme change, the colours its mesh slots copied out of the palette (its materials recolour themselves). */
function recolor(v: Vehicle) {
  const pal = v.pal;
  if (v.generation === pal.generation) return;
  v.generation = pal.generation;
  v.mats[2] = pal.tyre;
  v.mats[3] = pal.headlight;
  v.mats[4] = pal.taillight;
  v.mats[6] = pal.robot;
  v.mats[7] = pal.robotHead;
}

/** Drawable part of a vehicle: the vehicle itself, or a semi's trailer. */
export class VehicleItem implements Item {
  x0 = 0;
  x1 = 0;
  y0 = 0;
  y1 = 0;
  z0 = 0;
  z1 = 0;
  constructor(readonly v: Vehicle, readonly part: 0 | 1) {}

  bounds() {
    const b = this.v.bodies[this.part];
    const ex = Math.abs(b.hx) * b.hl + Math.abs(b.hy) * b.hw;
    const ey = Math.abs(b.hy) * b.hl + Math.abs(b.hx) * b.hw;
    let x0 = b.x - ex, x1 = b.x + ex, y0 = b.y - ey, y1 = b.y + ey;
    if (this.v.kind === 'forklift') {
      // forks and load stick out in front
      const fx = this.v.x + this.v.hx * 1.9, fy = this.v.y + this.v.hy * 1.9;
      x0 = Math.min(x0, fx - 0.6);
      x1 = Math.max(x1, fx + 0.6);
      y0 = Math.min(y0, fy - 0.6);
      y1 = Math.max(y1, fy + 0.6);
    }
    this.x0 = x0;
    this.x1 = x1;
    this.y0 = y0;
    this.y1 = y1;
    if (this.v.kind === 'roadster') {
      // turned on its side its body reaches out sideways and up; the jets reach down
      const r = this.v.roll === 0 ? 0 : 0.5;
      this.x0 -= r;
      this.x1 += r;
      this.y0 -= r;
      this.y1 += r;
    }
    this.z0 = Math.max(0, this.v.z - (this.v.z > 0 ? 0.4 : 0));
    this.z1 = this.v.z + (this.part === 1 ? 4.1 : this.v.h + (this.v.roll === 0 ? 0 : 0.5));
  }

  draw(r: R) {
    const v = this.v;
    const pal = v.pal;
    recolor(v);
    switch (v.kind) {
      case 'semi':
        if (this.part === 0) drawMesh(r, MESH.tractor, v.x, v.y, 0, v.hx, v.hy, v.mats);
        else drawTrailer(r, v);
        if (r.night && v.isLit) drawLampGlints(r, v, this.part === 0 ? 'front' : 'rear');
        break;
      case 'forklift':
        drawForklift(r, v);
        break;
      case 'roadster':
        drawJets(r, v, 'under');
        drawMesh(r, MESH.roadster, v.x, v.y, v.z, v.hx, v.hy, v.mats, v.roll, ROLL_Z);
        drawJets(r, v, 'over');
        if (r.night && v.isLit && v.z < 0.3) drawLampGlints(r, v, 'both');
        break;
      default: {
        const mesh = MESH[v.kind];
        drawMesh(r, mesh, v.x, v.y, 0, v.hx, v.hy, v.mats);
        if ((v.kind === 'pod' || v.kind === 'van') && v.door > 0.01) drawDoors(r, v);
        if (r.night && v.isLit) drawLampGlints(r, v, 'both');
      }
    }
    if (v.charging) {
      // small pulsing charge-port light at the front corner
      const p = 0.5 + 0.5 * Math.sin(r.t * 3 + v.id);
      const lx = v.x + v.hx * (v.hl - 0.2) - v.hy * (v.hw - 0.05);
      const ly = v.y + v.hy * (v.hl - 0.2) + v.hx * (v.hw - 0.05);
      const ctx = r.ctx;
      ctx.fillStyle = pal.led;
      ctx.globalAlpha = 0.45 + 0.55 * p;
      ctx.beginPath();
      ctx.arc((lx - ly) * C, (lx + ly) * 0.5 - 0.75, 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawDoors(r: R, v: Vehicle) {
  // gull-wing style doors: a panel on each side swinging up from the roof line
  const ctx = r.ctx;
  const k = v.door;
  const isVan = v.kind === 'van';
  for (const side of [1, -1]) {
    // only the camera-facing side reads at this size
    const nx = -v.hy * side, ny = v.hx * side;
    if (nx + ny <= 0) continue;
    // the van's door is its big glass panel mid-side (see its mesh)
    const l0 = isVan ? -0.95 : -0.9, l1 = isVan ? 0.95 : 0.6;
    const zb = isVan ? 0.42 : 0.45, zt = isVan ? 1.56 : 1.25;
    const w = v.hw * 0.98;
    const pts: number[] = [];
    if (isVan) {
      // sliding door: an opening that grows, the panel slides back
      const open = k * (l1 - l0);
      for (const [l, z] of [[l0, zb], [l0 + open, zb], [l0 + open, zt], [l0, zt]]) {
        const x = v.x + v.hx * l + nx * w, y = v.y + v.hy * l + ny * w;
        pts.push((x - y) * C, (x + y) * 0.5 - z);
      }
      fillQuad(r, '#1c1d22', pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
    } else {
      const lift = k * 1.1;
      for (const [l, z, out] of [[l0, zb + lift, 0.1 + k * 0.4], [l1, zb + lift, 0.1 + k * 0.4], [l1, zt + lift * 0.8, 0], [l0, zt + lift * 0.8, 0]]) {
        const x = v.x + v.hx * l + nx * (w + out), y = v.y + v.hy * l + ny * (w + out);
        pts.push((x - y) * C, (x + y) * 0.5 - z);
      }
      // dark opening first, then the raised door
      const op: number[] = [];
      for (const [l, z] of [[l0, zb], [l1, zb], [l1, zt], [l0, zt]]) {
        const x = v.x + v.hx * l + nx * w, y = v.y + v.hy * l + ny * w;
        op.push((x - y) * C, (x + y) * 0.5 - z);
      }
      ctx.globalAlpha = Math.min(1, k * 2);
      fillQuad(r, '#1c1d22', op[0], op[1], op[2], op[3], op[4], op[5], op[6], op[7]);
      ctx.globalAlpha = 1;
      const m = v.mats[0] as Mat;
      fillQuad(r, m.at(0.55 + k * 0.3), pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
    }
  }
}

function drawForklift(r: R, v: Vehicle) {
  const pal = v.pal;
  const fz = v.fork;
  const loadFirst = v.hx + v.hy < 0; // load is on the far side when driving away from the camera
  const drawLoad = () => {
    const ctx = r.ctx;
    // forks
    const pts: number[] = [];
    for (const [l, w] of [[2.0, 0.42], [2.0, -0.42], [0.95, -0.42], [0.95, 0.42]]) {
      const x = v.x + v.hx * l - v.hy * w, y = v.y + v.hy * l + v.hx * w;
      pts.push((x - y) * C, (x + y) * 0.5 - fz);
    }
    ctx.fillStyle = pal.tyre;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < 8; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
    if (v.load) drawMesh(r, MESH.crate, v.x + v.hx * 1.55, v.y + v.hy * 1.55, fz, v.hx, v.hy, [pal.crate, pal.carGlass, pal.concrete.right]);
  };
  if (loadFirst) drawLoad();
  drawMesh(r, MESH.forklift, v.x, v.y, 0, v.hx, v.hy, v.mats);
  if (!loadFirst) drawLoad();
}

/** Cargo slots along the trailer (distance back from the kingpin), filled front first. */
export const CARGO_SLOTS = [-2.6, -5.6, -8.6, -11.6];

function drawTrailer(r: R, v: Vehicle) {
  const ctx = r.ctx;
  const pal = v.pal;
  const kx = v.x - v.hx * 1.6, ky = v.y - v.hy * 1.6;
  const hx = v.thx, hy = v.thy;
  // the tractor's frame behind the cab, which the trailer rides over (it keeps the tractor's own heading)
  drawMesh(r, MESH.chassis, v.x, v.y, 0, v.hx, v.hy, v.mats);
  drawMesh(r, MESH.trailer, kx, ky, 0, hx, hy, v.mats);
  const open = v.door; // curtain side: 0 closed … 1 rolled up
  if (open <= 0.01) return;
  // the side that faces the camera rolls up
  const side = -hy + hx > 0 ? 1 : -1;
  const W = 1.272 * side;
  const pts: number[] = [];
  const P = (l: number, w: number, z: number) => {
    const x = kx + hx * l - hy * w, y = ky + hy * l + hx * w;
    pts.push((x - y) * C, (x + y) * 0.5 - z);
  };
  const top = 1.3 + 2.72 * open;
  pts.length = 0;
  P(-12.65, W, 1.3);
  P(0.45, W, 1.3);
  P(0.45, W, top);
  P(-12.65, W, top);
  const op = pts.slice();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(op[0], op[1]);
  for (let i = 2; i < 8; i += 2) ctx.lineTo(op[i], op[i + 1]);
  ctx.closePath();
  ctx.fillStyle = pal.night ? '#0d0e11' : '#61636c';
  ctx.fill();
  ctx.clip();
  // floor
  pts.length = 0;
  P(-12.65, -W, 1.3);
  P(0.45, -W, 1.3);
  P(0.45, W, 1.3);
  P(-12.65, W, 1.3);
  fillQuad(r, pal.night ? '#1b1c21' : '#80828b', pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
  // posts every few metres
  ctx.strokeStyle = pal.night ? '#24262c' : '#8f919a';
  ctx.lineWidth = 0.1;
  ctx.beginPath();
  for (let l = -12.6; l <= 0.5; l += 3.27) {
    pts.length = 0;
    P(l, -W * 0.98, 1.3);
    P(l, -W * 0.98, 4.05);
    ctx.moveTo(pts[0], pts[1]);
    ctx.lineTo(pts[2], pts[3]);
  }
  ctx.stroke();
  const n = Math.round(v.cargo * CARGO_SLOTS.length);
  const cm = [pal.crate, pal.carGlass, pal.concrete.right];
  for (const w of [-0.62 * side, 0.62 * side]) {
    for (let i = 0; i < n; i++) {
      for (const dl of [0.62, -0.62]) {
        const l = CARGO_SLOTS[i] + dl;
        const cx = kx + hx * l - hy * w, cy = ky + hy * l + hx * w;
        drawMesh(r, MESH.crate, cx, cy, 1.3, hx, hy, cm);
        drawMesh(r, MESH.crate, cx, cy, 2.27, hx, hy, cm);
      }
    }
  }
  ctx.restore();
  // the rolled-up curtain along the top
  pts.length = 0;
  P(-12.75, W * 1.01, top);
  P(0.55, W * 1.01, top);
  P(0.55, W * 1.01, Math.min(4.08, top + 0.28));
  P(-12.75, W * 1.01, Math.min(4.08, top + 0.28));
  fillQuad(r, (v.mats[5] as Mat).at(0.45), pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
}
