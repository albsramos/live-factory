// Building a smooth vehicle body as a stack of horizontal slices: each slice is a rounded plan, each slice to the
// next is one convex part, and the side profile comes from how far forward and back, how wide and how rounded each
// slice is. Decals (glass, light bars, wheel arches) go onto the faces of the bands between slices, each band's
// right after that band, so a mesh drawn in the order built (bottom up) lets the bands above cover them.

import type { MeshBuilder } from '../mesh';

/** Steps on each rounded corner of a plan; every plan has the same vertex count, so any two can be joined. */
export const STEPS = 3;

/**
 * A slice's plan, counter-clockwise in (l, w): front at `lf`, back at `lr`, half width `w`, front corners rounded by
 * `rf` and back corners by `rr`. Its edges, in order: the front +w corner, the +w side, the back +w corner, the
 * back, the back -w corner, the -w side, the front -w corner, the front.
 */
export function plan(lf: number, lr: number, w: number, rf: number, rr: number): number[][] {
  const corners: [number, number, number, number][] = [
    [lf - rf, w - rf, rf, 0],
    [lr + rr, w - rr, rr, 1],
    [lr + rr, -w + rr, rr, 2],
    [lf - rf, -w + rf, rf, 3],
  ];
  const out: number[][] = [];
  for (const [cl, cw, r, q] of corners) {
    for (let i = 0; i <= STEPS; i++) {
      const a = (q * Math.PI) / 2 + (i / STEPS) * (Math.PI / 2);
      out.push([cl + Math.cos(a) * r, cw + Math.sin(a) * r]);
    }
  }
  return out;
}

/** Where an edge of a plan lies round the body (see `plan` for the order). */
export type Place = 'frontCorner' | 'side' | 'rearCorner' | 'rear' | 'front';
export function placeOf(k: number): Place {
  const q = Math.floor(k / (STEPS + 1)), isStraight = k % (STEPS + 1) === STEPS;
  if (isStraight) return q === 1 ? 'rear' : q === 3 ? 'front' : 'side';
  return q === 0 || q === 3 ? 'frontCorner' : 'rearCorner';
}

/** A face of a band: its four corners (bottom a, bottom b, top b, top a) in (l, w, z) and where it lies. */
export interface BandFace {
  pts: number[][];
  place: Place;
}

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

export class SlicedBody {
  readonly rings: { z: number; pts: number[][] }[];
  /** the middle of the body, which decals face away from */
  private c: number[];

  /**
   * Build the bands between consecutive slices, `mats[i]` colouring band i's sides and its top, and after each band
   * call `decorate` to lay that band's decals.
   */
  constructor(private m: MeshBuilder, slices: { z: number; pts: number[][] }[], mats: number[], decorate: (body: SlicedBody, band: number) => void) {
    this.rings = slices;
    const all = slices.flatMap((s) => s.pts.map(([l, w]) => [l, w, s.z]));
    this.c = [0, 1, 2].map((i) => all.reduce((a, p) => a + p[i], 0) / all.length);
    for (let i = 1; i < slices.length; i++) {
      m.frustum(slices[i - 1].pts, slices[i - 1].z, slices[i].pts, slices[i].z, mats[i - 1], mats[i - 1]);
      decorate(this, i - 1);
    }
  }

  /** The faces of the band between slice i and slice i + 1. */
  band(i: number): BandFace[] {
    const a = this.rings[i], b = this.rings[i + 1];
    return a.pts.map((p, k) => {
      const nk = (k + 1) % a.pts.length;
      return { pts: [[...p, a.z], [...a.pts[nk], a.z], [...b.pts[nk], b.z], [...b.pts[k], b.z]], place: placeOf(k) };
    });
  }

  /** A decal on a face, as a polygon in (u along it, v up it), lifted just off it. */
  poly(f: BandFace, uv: number[][], mat: number) {
    const [p0, p1, p2, p3] = f.pts;
    const at = (u: number, v: number) => mix(mix(p0, p1, u), mix(p3, p2, u), v);
    const a = p1.map((v, i) => v - p0[i]), b = p3.map((v, i) => v - p0[i]);
    let n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const c = at(0.5, 0.5);
    if (n[0] * (c[0] - this.c[0]) + n[1] * (c[1] - this.c[1]) + n[2] * (c[2] - this.c[2]) < 0) n = n.map((v) => -v);
    const k = 0.006 / (Math.hypot(n[0], n[1], n[2]) || 1);
    this.m.decal(uv.map(([u, v]) => at(u, v)).map(([l, w, z]) => [l + n[0] * k, w + n[1] * k, z + n[2] * k]), mat, n[0], n[1], n[2]);
  }

  /** A decal covering u0..u1 along a face and v0..v1 up it. */
  rect(f: BandFace, u0: number, u1: number, v0: number, v1: number, mat: number) {
    this.poly(f, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], mat);
  }

  /** Where length `l` falls along a side face, as u, on its bottom edge or its top edge. */
  uAt(f: BandFace, l: number, isTop = false) {
    const l0 = isTop ? f.pts[3][0] : f.pts[0][0], l1 = isTop ? f.pts[2][0] : f.pts[1][0];
    return (l - l0) / (l1 - l0);
  }
}
