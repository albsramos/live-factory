// The semi's tractor: a tall aerodynamic cab built as a stack of horizontal slices, so its side profile (low rounded
// nose, raked wraparound windscreen, domed roof sweeping back to the trailer's height) comes from how far forward,
// how wide and how rounded each slice is. Material slots as in meshes.ts: 0 paint, 1 glass, 2 dark, 3 head light.

import { MeshBuilder, type Mesh } from '../mesh';

/** Back of the cab, a little ahead of the trailer's nose (which sits at -1.0) so the two clear in a turn. */
const LR = -0.7;
/** Corner steps on each rounded corner of a slice; every slice has the same vertex count. */
const STEPS = 3;

/**
 * A slice's plan, counter-clockwise in (l, w): front at `lf`, back at LR, half width `w`, front corners rounded by
 * `rf`, back corners by a small fixed radius.
 */
function plan(lf: number, w: number, rf: number): number[][] {
  const rb = 0.12;
  const corners: [number, number, number, number][] = [
    [lf - rf, w - rf, rf, 0],
    [LR + rb, w - rb, rb, 1],
    [LR + rb, -w + rb, rb, 2],
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

/** The cab's slices, bottom up: [height, front, half width, front corner radius]. */
const SLICES: [number, number, number, number][] = [
  [0.8, 3.12, 1.22, 0.55], // top of the black bumper
  [1.28, 3.2, 1.25, 0.6], // the light bar's line
  [1.6, 3.02, 1.25, 0.72], // round over the nose
  [1.98, 2.56, 1.24, 0.82], // base of the windscreen
  [3.02, 1.66, 1.13, 0.76], // top of the windscreen
  [3.42, 1.02, 1.06, 0.6],
  [3.74, 0.38, 0.98, 0.48],
  [3.95, -0.32, 0.9, 0.3], // the roof, level with the trailer's front edge
];

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

export function tractorMesh(): Mesh {
  const m = new MeshBuilder();
  const box = (l0: number, l1: number, w: number) => [[l1, -w], [l1, w], [l0, w], [l0, -w]];
  // wheels and frame, the fifth-wheel plate, and the black bumper wrapping the nose
  m.frustum(box(-3.0, 2.7, 0.92), 0, box(-3.0, 2.7, 0.92), 0.8, 2, 2);
  m.frustum(box(-2.5, -0.9, 0.7), 0.8, box(-2.5, -0.9, 0.7), 1.0, 2, 2);
  const bumper = plan(3.08, 1.2, 0.5);
  m.frustum(bumper, 0.36, bumper, 0.8, 2, 2);

  // the cab: each slice to the next is one convex part
  const rings = SLICES.map(([z, lf, w, rf]) => ({ z, pts: plan(lf, w, rf) }));
  for (let i = 1; i < rings.length; i++) m.frustum(rings[i - 1].pts, rings[i - 1].z, rings[i].pts, rings[i].z, 0, 0);

  /** The side faces of the band between two slices, each as [bottom a, bottom b, top b, top a] in (l, w, z). */
  const band = (i: number) =>
    rings[i].pts.map((p, k) => {
      const a = rings[i], b = rings[i + 1], nk = (k + 1) % a.pts.length;
      return [[...p, a.z], [...a.pts[nk], a.z], [...b.pts[nk], b.z], [...b.pts[k], b.z]];
    });
  /** A decal on a face, as a polygon in (u along it, v up it), lifted just off it. */
  const onPoly = (f: number[][], uv: number[][], mat: number) => {
    const at = (u: number, v: number) => mix(mix(f[0], f[1], u), mix(f[3], f[2], u), v);
    const a = f[1].map((v, i) => v - f[0][i]), b = f[3].map((v, i) => v - f[0][i]);
    let n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const c = at(0.5, 0.5);
    // outward: away from the cab's middle
    if (n[0] * (c[0] - 1.2) + n[1] * c[1] + n[2] * (c[2] - 1.8) < 0) n = n.map((v) => -v);
    const k = 0.006 / (Math.hypot(n[0], n[1], n[2]) || 1);
    m.decal(uv.map(([u, v]) => at(u, v)).map(([l, w, z]) => [l + n[0] * k, w + n[1] * k, z + n[2] * k]), mat, n[0], n[1], n[2]);
  };
  const on = (f: number[][], u0: number, u1: number, v0: number, v1: number, mat: number) =>
    onPoly(f, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], mat);
  // a face's place round the slice: its plan direction tells the nose and its corners from the sides and the back
  const dir = (f: number[][]) => {
    const dl = f[1][0] - f[0][0], dw = f[1][1] - f[0][1];
    return { dl, dw, len: Math.hypot(dl, dw) };
  };
  const isFront = (f: number[][]) => f[0][0] > 1 && Math.abs(dir(f).dl) < 0.6 * dir(f).len;
  const isNoseCorner = (f: number[][]) => f[0][0] > 1 && !isFront(f) && dir(f).len < 1.2;
  const isSide = (f: number[][]) => dir(f).len > 1.2 && Math.abs(dir(f).dw) < 0.1;

  // the windscreen wraps round the nose's corners and runs back along the sides as the door glass; its back edge
  // leans forward and its top corner is rounded
  const SCREEN = 3, WIN_BACK_LOW = 0.35, WIN_BACK_TOP = 0.7;
  for (const f of band(SCREEN)) {
    if (isFront(f) || isNoseCorner(f)) on(f, 0, 1, 0.02, 0.98, 1);
    else if (isSide(f)) {
      // the face runs front to back on one side of the cab and back to front on the other: measure from its front
      const fwd = f[0][0] > f[1][0];
      const at = (l: number, top: boolean) => {
        const l0 = top ? f[3][0] : f[0][0], l1 = top ? f[2][0] : f[1][0];
        return (l - l0) / (l1 - l0);
      };
      const front = fwd ? 0 : 1;
      const low = at(WIN_BACK_LOW, false), top = at(WIN_BACK_TOP, true);
      // the back edge leans forward, and rounds into the top edge
      const back = (v: number) => low + (top - low) * v;
      const bend = fwd ? -0.08 : 0.08;
      onPoly(f, [[front, 0.02], [back(0.02), 0.02], [back(0.7), 0.7], [back(0.86) + bend * 0.5, 0.9], [back(0.98) + bend, 0.98], [front, 0.98]], 1);
    }
  }
  // the thin light bar right across the nose at its widest, and a brighter lamp where it turns the corner
  const BAR = 0;
  for (const f of band(BAR)) {
    if (isFront(f)) on(f, 0, 1, 0.86, 0.93, 3);
    else if (isNoseCorner(f)) on(f, 0, 1, 0.82, 0.95, 3);
  }
  // a dark seam down the cab's trailing edge, where it meets the trailer
  for (let i = 1; i < rings.length - 1; i++)
    for (const f of band(i))
      if (isSide(f)) {
        const fwd = f[0][0] > f[1][0];
        on(f, fwd ? 0.93 : 0, fwd ? 1 : 0.07, 0, 1, 2);
      }

  // stacked bottom up, so drawn in the order built
  return m.build();
}

/**
 * A camera mirror on one side (`s` = 1 or -1): a slim dark arm out of the A-pillar's foot and a pod at its end. Kept
 * apart from the cab so it can be drawn before or after it, as the cab hides it or not.
 */
export function mirrorMesh(s: number): Mesh {
  const m = new MeshBuilder();
  const arm = [[2.3, 1.16], [2.48, 1.42], [2.58, 1.42], [2.4, 1.16]].map(([l, w]) => [l, s * w]);
  const ccw = s > 0 ? arm : arm.slice().reverse();
  m.frustum(ccw, 2.04, ccw, 2.12, 2, 2);
  const pod = [[2.62, -0.07], [2.62, 0.07], [2.46, 0.07], [2.46, -0.07]].map(([l, w]) => [l, w + s * 1.47]);
  m.frustum(pod, 1.74, pod, 2.36, 2, 2);
  return m.build(true);
}
