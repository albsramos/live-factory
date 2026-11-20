// Vehicle meshes and sizes. Material slots: 0 paint, 1 glass, 2 dark/tyre, 3 head light, 4 tail light, 5 secondary
// paint, 6 and 7 dark trim.

import { MeshBuilder } from '../mesh';

const box = (l0: number, l1: number, w: number): number[][] => [[l1, -w], [l1, w], [l0, w], [l0, -w]];

function rounded(a: number, b: number, r: number, steps = 2): number[][] {
  // counter-clockwise rounded rectangle in l/w
  const out: number[][] = [];
  const cs = [[a - r, b - r, 0], [-a + r, b - r, 1], [-a + r, -b + r, 2], [a - r, -b + r, 3]];
  for (const [cx, cy, q] of cs) {
    for (let i = 0; i <= steps; i++) {
      const ang = (q * Math.PI) / 2 + (i / steps) * (Math.PI / 2);
      out.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
    }
  }
  return out;
}

const inset = (p: number[][], k: number, dl = 0) => p.map(([l, w]) => [l * k + dl, w * k]);

/** Light strips as flush decals on the front (+l) or rear (-l) face. */
function lights(m: MeshBuilder, l: number, w: number, z0: number, z1: number, mat: number, split = 0) {
  const n = l > 0 ? 1 : -1;
  if (split > 0) {
    for (const s of [1, -1]) {
      const a = s * split, b = s * w;
      m.decal([[l, a, z0], [l, b, z0], [l, b, z1], [l, a, z1]], mat, n, 0, 0);
    }
  } else m.decal([[l, -w, z0], [l, w, z0], [l, w, z1], [l, -w, z1]], mat, n, 0, 0);
}

export const MESH = {
  car: (() => {
    const m = new MeshBuilder();
    m.frustum(box(-2.05, 2.05, 0.86), 0, box(-2.05, 2.05, 0.86), 0.44, 2, 2);
    const body = rounded(2.35, 0.97, 0.42, 2);
    m.frustum(body, 0.3, body.map(([l, w]) => [l * 0.97 - 0.04, w * 0.95]), 0.86, 0, 0);
    m.frustum(box(-1.6, 0.95, 0.86), 0.86, box(-1.12, 0.22, 0.6), 1.42, 1, 1);
    lights(m, 2.351, 0.62, 0.6, 0.67, 3);
    lights(m, -2.351, 0.66, 0.64, 0.72, 4);
    return m.build();
  })(),
  suv: (() => {
    const m = new MeshBuilder();
    m.frustum(box(-2.1, 2.1, 0.9), 0, box(-2.1, 2.1, 0.9), 0.5, 2, 2);
    const body = rounded(2.4, 1.0, 0.4, 2);
    m.frustum(body, 0.36, body.map(([l, w]) => [l * 0.97 - 0.02, w * 0.95]), 1.0, 0, 0);
    m.frustum(box(-1.95, 1.0, 0.9), 1.0, box(-1.75, 0.3, 0.66), 1.65, 1, 1);
    lights(m, 2.401, 0.64, 0.72, 0.8, 3);
    lights(m, -2.401, 0.68, 0.78, 0.86, 4);
    return m.build();
  })(),
  pickup: (() => {
    const m = new MeshBuilder();
    m.frustum(box(-2.5, 2.5, 0.95), 0, box(-2.5, 2.5, 0.95), 0.5, 2, 2);
    m.extrude([[-2.85, 0.42], [2.85, 0.42], [2.85, 1.05], [0.45, 1.98], [-2.85, 1.3]], -1.05, 1.05, [2, 0, 1, 0, 0], 0);
    m.extrude([[-0.95, 1.32], [1.55, 1.32], [0.5, 1.86], [-0.95, 1.66]], -1.051, 1.051, [1], 1, true);
    lights(m, 2.851, 0.98, 0.9, 0.97, 3);
    lights(m, -2.851, 1.0, 1.14, 1.22, 4);
    return m.build();
  })(),
  pod: (() => {
    const m = new MeshBuilder();
    m.frustum(box(-1.5, 1.5, 0.78), 0, box(-1.5, 1.5, 0.78), 0.38, 2, 2);
    const body = rounded(1.9, 0.95, 0.55, 3);
    m.frustum(body, 0.27, inset(body, 0.97), 0.74, 0, 0);
    const cb = rounded(1.3, 0.86, 0.4, 2).map(([l, w]) => [l - 0.2, w]);
    const ct = rounded(0.62, 0.56, 0.3, 2).map(([l, w]) => [l - 0.05, w]);
    m.frustum(cb, 0.74, ct, 1.33, 1, 1);
    lights(m, 1.901, 0.38, 0.55, 0.61, 3);
    lights(m, -1.901, 0.4, 0.56, 0.62, 4);
    return m.build();
  })(),
  van: (() => {
    const m = new MeshBuilder();
    m.frustum(box(-3.1, 3.1, 1.05), 0, box(-3.1, 3.1, 1.05), 0.36, 2, 2);
    const fp = rounded(3.6, 1.22, 1.0, 3);
    m.frustum(fp, 0.28, inset(fp, 0.99), 0.95, 0, 0);
    m.frustum(inset(fp, 0.985), 0.95, inset(fp, 0.96), 1.72, 1, 1);
    m.frustum(inset(fp, 0.96), 1.72, inset(rounded(3.3, 1.0, 0.95, 3), 1), 2.02, 0, 0);
    lights(m, 3.601, 0.2, 0.62, 0.68, 3);
    lights(m, -3.601, 0.22, 0.62, 0.68, 4);
    return m.build();
  })(),
  tractor: (() => {
    const m = new MeshBuilder();
    // wheels and frame, then the fifth-wheel plate
    m.frustum(box(-3.0, 2.7, 0.92), 0, box(-3.0, 2.7, 0.92), 0.78, 2, 2);
    m.frustum(box(-2.5, -0.9, 0.7), 0.78, box(-2.5, -0.9, 0.7), 0.98, 2, 2);
    // aerodynamic cab: low nose, long raked windscreen
    m.extrude([[-0.7, 0.55], [3.15, 0.55], [3.2, 1.55], [1.35, 3.35], [0.2, 3.62], [-0.7, 3.62]], -1.25, 1.25, [2, 0, 1, 0, 0, 0], 0);
    m.extrude([[0.6, 2.2], [1.95, 2.2], [1.2, 2.95], [0.6, 3.05]], -1.251, 1.251, [1], 1, true);
    lights(m, 3.172, 0.95, 1.0, 1.08, 3);
    return m.build(true);
  })(),
  trailer: (() => {
    const m = new MeshBuilder();
    m.frustum(box(-12.3, -8.6, 1.05), 0, box(-12.3, -8.6, 1.05), 1.25, 2, 2);
    m.frustum(box(-1.7, -1.3, 0.95), 0.1, box(-1.7, -1.3, 0.95), 1.22, 2, 2);
    m.frustum(box(-12.8, 0.6, 1.27), 1.2, box(-12.8, 0.6, 1.27), 4.1, 5, 5);
    lights(m, -12.801, 1.15, 1.3, 1.46, 4, 0.75);
    return m.build();
  })(),
  roadster: (() => {
    // a low wedge with a dark glass canopy, a full-width light bar at each end and a low, slim wing in the body's
    // paint on two short struts, just above the tail
    const m = new MeshBuilder();
    m.frustum(box(-1.7, 1.7, 0.94), 0, box(-1.7, 1.7, 0.94), 0.4, 2, 2);
    const body = rounded(2.3, 1.04, 0.36, 2);
    m.frustum(body, 0.22, body.map(([l, w]) => [l * 0.98 - 0.03, w * 0.95]), 0.64, 0, 0);
    m.frustum([[1.25, -0.84], [1.25, 0.84], [-1.95, 0.9], [-1.95, -0.9]], 0.64, [[-0.25, -0.52], [-0.25, 0.52], [-1.5, 0.58], [-1.5, -0.58]], 1.0, 1, 1);
    for (const w of [0.46, -0.46]) m.frustum(box(-2.06, -1.96, 0.035).map(([l, d]) => [l, d + w]), 0.64, box(-2.1, -2.0, 0.035).map(([l, d]) => [l, d + w]), 0.84, 6, 6);
    m.frustum(box(-2.38, -2.0, 0.98), 0.82, box(-2.38, -2.04, 0.98), 0.87, 0, 0);
    lights(m, 2.301, 0.6, 0.48, 0.54, 3);
    lights(m, -2.301, 0.62, 0.44, 0.53, 4);
    return m.build();
  })(),
  forklift: (() => {
    const m = new MeshBuilder();
    m.frustum(box(-0.95, 0.75, 0.6), 0, box(-0.95, 0.75, 0.6), 0.34, 2, 2);
    m.frustum(box(-1.05, 0.72, 0.62), 0.3, box(-1.0, 0.7, 0.6), 1.02, 0, 0);
    m.frustum(box(-1.18, -0.6, 0.62), 0.3, box(-1.15, -0.62, 0.6), 1.3, 0, 0);
    // robot operator
    m.frustum(box(-0.5, -0.05, 0.24), 1.02, box(-0.45, -0.1, 0.22), 1.72, 6, 6);
    m.frustum(box(-0.36, -0.12, 0.12), 1.78, box(-0.36, -0.12, 0.12), 2.04, 7, 7);
    // guard posts and roof
    for (const [l, w] of [[0.55, 0.55], [0.55, -0.55], [-0.68, 0.55], [-0.68, -0.55]]) {
      const p = box(l - 0.03, l + 0.03, 0.03).map(([a, b]) => [a, b + w]);
      m.frustum(p, 1.0, p, 2.22, 2, 2);
    }
    m.frustum(box(-0.72, 0.6, 0.6), 2.22, box(-0.72, 0.6, 0.6), 2.3, 0, 0);
    // mast
    m.frustum(box(0.8, 0.92, 0.44), 0.1, box(0.8, 0.92, 0.44), 2.55, 2, 2);
    return m.build(true);
  })(),
  crate: (() => {
    const m = new MeshBuilder();
    m.frustum(box(-0.55, 0.55, 0.55), 0, box(-0.55, 0.55, 0.55), 0.12, 2, 2);
    m.frustum(box(-0.52, 0.52, 0.52), 0.12, box(-0.52, 0.52, 0.52), 0.95, 0, 0);
    return m.build();
  })(),
};

export type VehicleKind = 'car' | 'suv' | 'pickup' | 'pod' | 'van' | 'roadster' | 'semi' | 'forklift';

export const DIMS: Record<VehicleKind, [number, number, number]> = {
  // half length, half width, height
  car: [2.38, 0.98, 1.42],
  suv: [2.43, 1.0, 1.65],
  pickup: [2.88, 1.06, 1.98],
  pod: [1.92, 0.96, 1.33],
  van: [3.62, 1.23, 2.02],
  roadster: [2.32, 1.04, 1.05],
  semi: [3.15, 1.27, 3.62],
  forklift: [1.15, 0.62, 2.55],
};
