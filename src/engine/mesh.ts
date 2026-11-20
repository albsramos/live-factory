// Meshes: small convex solids in local space (l forward, w left, z up), placed by a position and heading. Vehicles
// and a few props are built from them.

import { C, type Mat, lightT } from './core';
import { shadeFace } from './shade';
import type { R } from './draw';

export interface Face {
  idx: number[];
  mat: number;
  nl: number;
  nw: number;
  nz: number;
}

export interface Part {
  /** face range */
  s: number;
  e: number;
  d?: number;
  /** centroid in local space */
  l: number;
  w: number;
  z: number;
}

export interface Mesh {
  v: number[]; // l, w, z triples
  faces: Face[];
  parts: Part[];
  /** draw convex parts back to front each frame (for machines whose parts sit side by side) */
  sort: boolean;
  /** faces from this index on are flush decals, always drawn last */
  decals: number;
}

export class MeshBuilder {
  v: number[] = [];
  faces: Face[] = [];
  private cl = 0;
  private cw = 0;
  private cz = 0;
  vert(l: number, w: number, z: number) {
    this.v.push(l, w, z);
    return this.v.length / 3 - 1;
  }
  face(idx: number[], mat: number) {
    this.faces.push({ idx, mat, nl: 0, nw: 0, nz: 0 });
  }
  /** A prism between two polygons (counter-clockwise in l/w) with the same vertex count. */
  frustum(bot: number[][], z0: number, top: number[][], z1: number, side: number, cap: number, bottomFace = false) {
    const b = bot.map((p) => this.vert(p[0], p[1], z0));
    const t = top.map((p) => this.vert(p[0], p[1], z1));
    const n = b.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      this.face([b[i], b[j], t[j], t[i]], side);
    }
    this.face(t.slice(), cap);
    if (bottomFace) this.face(b.slice().reverse(), cap);
    return this.group();
  }
  /**
   * Extrude a convex side profile (l, z pairs) across the width w0..w1. `mats[i]` colours the edge i→i+1.
   * With `capsOnly` only the two side caps are kept, which makes flush decals such as side windows.
   */
  extrude(profile: number[][], w0: number, w1: number, mats: number[], capMat: number, capsOnly = false) {
    const a = profile.map((p) => this.vert(p[0], w0, p[1]));
    const b = profile.map((p) => this.vert(p[0], w1, p[1]));
    const n = profile.length;
    if (capsOnly) {
      // orient caps by hand: the centroid test needs the side faces
      return this.decal(profile.map((p) => [p[0], w0, p[1]]), capMat, 0, w0 < w1 ? -1 : 1, 0).decal(profile.map((p) => [p[0], w1, p[1]]), capMat, 0, w0 < w1 ? 1 : -1, 0);
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      this.face([a[i], a[j], b[j], b[i]], mats[i] ?? mats[mats.length - 1]);
    }
    this.face(a.slice(), capMat);
    this.face(b.slice(), capMat);
    return this.group();
  }
  private parts: Part[] = [];
  private decalStart = -1;

  /**
   * A flat decal (lights, badges) lying on a face, with that face's outward normal: drawn only when the face
   * looks at the camera, and after every solid part.
   */
  decal(pts: number[][], mat: number, nl: number, nw: number, nz: number) {
    if (this.decalStart < 0) this.decalStart = this.faces.length;
    const idx = pts.map((p) => this.vert(p[0], p[1], p[2]));
    this.faces.push({ idx, mat, nl, nw, nz });
    this.groupStart = this.faces.length;
    return this;
  }

  /** Finish the mesh. */
  build(sort = false): Mesh {
    if (this.groupStart < this.faces.length) this.group();
    return { v: this.v, faces: this.faces, parts: this.parts, sort, decals: this.decalStart < 0 ? this.faces.length : this.decalStart };
  }
  /**
   * Close the convex part made of every face added since the last call: compute its normals (Newell's method)
   * and point them away from the part's centroid.
   */
  group() {
    const v = this.v;
    const start = this.groupStart;
    let sl = 0, sw = 0, sz = 0, n = 0;
    const seen = new Set<number>();
    for (let i = start; i < this.faces.length; i++) for (const k of this.faces[i].idx) if (!seen.has(k)) {
      seen.add(k);
      sl += v[k * 3];
      sw += v[k * 3 + 1];
      sz += v[k * 3 + 2];
      n++;
    }
    this.cl = sl / n;
    this.cw = sw / n;
    this.cz = sz / n;
    for (let i = start; i < this.faces.length; i++) {
      const f = this.faces[i];
      let nl = 0, nw = 0, nz = 0, fl = 0, fw = 0, fz = 0;
      for (let q = 0; q < f.idx.length; q++) {
        const a = f.idx[q] * 3, b = f.idx[(q + 1) % f.idx.length] * 3;
        nl += (v[a + 1] - v[b + 1]) * (v[a + 2] + v[b + 2]);
        nw += (v[a + 2] - v[b + 2]) * (v[a] + v[b]);
        nz += (v[a] - v[b]) * (v[a + 1] + v[b + 1]);
        fl += v[a];
        fw += v[a + 1];
        fz += v[a + 2];
      }
      const k = f.idx.length;
      const d = nl * (fl / k - this.cl) + nw * (fw / k - this.cw) + nz * (fz / k - this.cz);
      if (d < 0) {
        nl = -nl;
        nw = -nw;
        nz = -nz;
        f.idx.reverse();
      }
      f.nl = nl;
      f.nw = nw;
      f.nz = nz;
    }
    this.parts.push({ s: start, e: this.faces.length, l: this.cl, w: this.cw, z: this.cz });
    this.groupStart = this.faces.length;
    return this;
  }
  private groupStart = 0;
}

export type MatSlot = Mat | string;

const SCR = new Float64Array(3 * 256);
const WLD = new Float64Array(3 * 256);
const FACE: number[] = [];

/**
 * Draw a mesh at (px, py, pz) facing (hx, hy). Faces turned away from the camera are skipped, so each convex
 * part draws correctly in any order; parts are drawn in the order they were added.
 *
 * With `roll` the mesh also turns about its length axis (radians, about the height `rollZ`), and its parts are
 * drawn from the one furthest below the camera's side of the body up, so a body upside down still stacks right.
 */
export function drawMesh(r: R, m: Mesh, px: number, py: number, pz: number, hx: number, hy: number, mats: MatSlot[], roll?: number, rollZ = 0) {
  const v = m.v;
  const n = v.length / 3;
  RC = roll === undefined ? 1 : Math.cos(roll);
  RS = roll === undefined ? 0 : Math.sin(roll);
  for (let i = 0; i < n; i++) {
    const l = v[i * 3];
    let w = v[i * 3 + 1], z = v[i * 3 + 2];
    if (roll !== undefined) {
      const zc = z - rollZ;
      w = w * RC - zc * RS;
      z = rollZ + v[i * 3 + 1] * RS + zc * RC;
    }
    const x = px + l * hx - w * hy;
    const y = py + l * hy + w * hx;
    SCR[i * 2] = (x - y) * C;
    SCR[i * 2 + 1] = (x + y) * 0.5 - z - pz;
    WLD[i * 3] = x;
    WLD[i * 3 + 1] = y;
    WLD[i * 3 + 2] = z + pz;
  }
  // only bother with building shadows when one could reach this mesh
  let near = false;
  if (r.casters && r.faceShadow) for (const c of r.casters) if (px > c.bx0 - 8 && px < c.bx1 + 8 && py > c.by0 - 8 && py < c.by1 + 8) near = true;
  SHADE = near;
  const ctx = r.ctx;
  ctx.lineWidth = r.hair;
  ctx.lineJoin = 'round';
  if (roll !== undefined) {
    // stacked parts (wheels, body, canopy, wing) in the order they face the camera across the turned body
    ORDER.length = 0;
    for (const p of m.parts) {
      if (p.s >= m.decals) continue;
      const zc = p.z - rollZ;
      p.d = (p.w * RC - zc * RS) * (hx - hy) + (p.w * RS + zc * RC) * 0.8;
      ORDER.push(p);
    }
    ORDER.sort((a, b) => a.d! - b.d!);
    for (const p of ORDER) drawFaces(r, m, p.s, p.e, hx, hy, mats);
    drawFaces(r, m, m.decals, m.faces.length, hx, hy, mats);
  } else if (m.sort) {
    // convex parts back to front along the view direction
    ORDER.length = 0;
    for (const p of m.parts) {
      if (p.s >= m.decals) continue;
      const x = px + p.l * hx - p.w * hy, y = py + p.l * hy + p.w * hx;
      p.d = x + y + p.z * 0.8;
      ORDER.push(p);
    }
    ORDER.sort((a, b) => a.d! - b.d!);
    for (const p of ORDER) drawFaces(r, m, p.s, p.e, hx, hy, mats);
    drawFaces(r, m, m.decals, m.faces.length, hx, hy, mats);
  } else drawFaces(r, m, 0, m.faces.length, hx, hy, mats);
}

const ORDER: (Part & { d?: number })[] = [];
let SHADE = false;
/** the current mesh's roll, as cosine and sine */
let RC = 1;
let RS = 0;

function drawFaces(r: R, m: Mesh, s: number, e: number, hx: number, hy: number, mats: MatSlot[]) {
  const ctx = r.ctx;
  for (let fi = s; fi < e; fi++) {
    const f = m.faces[fi];
    const nw = f.nw * RC - f.nz * RS, nz = f.nw * RS + f.nz * RC;
    const nx = f.nl * hx - nw * hy;
    const ny = f.nl * hy + nw * hx;
    if (nx + ny + nz <= 1e-9) continue;
    const s = mats[f.mat];
    const fill = typeof s === 'string' ? s : s.at(lightT(nx, ny, nz));
    const idx = f.idx;
    ctx.beginPath();
    ctx.moveTo(SCR[idx[0] * 2], SCR[idx[0] * 2 + 1]);
    for (let k = 1; k < idx.length; k++) ctx.lineTo(SCR[idx[k] * 2], SCR[idx[k] * 2 + 1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = fill;
    ctx.stroke();
    if (SHADE) {
      FACE.length = 0;
      for (const k of idx) FACE.push(WLD[k * 3], WLD[k * 3 + 1], WLD[k * 3 + 2]);
      shadeFace(ctx, FACE, r.casters!, r.faceShadow!);
    }
  }
}
