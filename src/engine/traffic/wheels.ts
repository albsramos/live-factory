// Round wheels for the vehicle meshes: a tyre is a short many-sided prism across the vehicle's width. A body's wheels
// go in its `under` mesh, drawn just before it and sorted among themselves, so a far wheel never covers a near one.

import { MeshBuilder, type Mesh } from '../mesh';

/** Material slot of the tyres (dark), as in meshes.ts. */
const TYRE = 2;

/**
 * A pair of tyres on each axle at `axles` (along the body), of radius `r`, each reaching from `w0` to `w1` out from
 * the centre line on its side.
 */
export function addWheels(m: MeshBuilder, axles: readonly number[], r: number, w0: number, w1: number, sides = 10) {
  const tyre = Array.from({ length: sides }, (_, i) => {
    const a = ((i + 0.5) / sides) * Math.PI * 2;
    return [Math.cos(a) * r, r + Math.sin(a) * r];
  });
  for (const L of axles) for (const s of [1, -1]) m.extrude(tyre.map(([l, z]) => [l + L, z]), s * w0, s * w1, [TYRE], TYRE);
}

/**
 * A body's `under` mesh: whatever dark frame or underbody `frame` builds, then the wheels from `addWheels`, sorted so
 * they stack right from any side.
 */
export function wheelsMesh(frame: (m: MeshBuilder) => void, axles: readonly number[], r: number, w0: number, w1: number): Mesh {
  const m = new MeshBuilder();
  frame(m);
  addWheels(m, axles, r, w0, w1);
  return m.build(true);
}
