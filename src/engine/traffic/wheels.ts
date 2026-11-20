// Round wheels for the vehicle meshes: a tyre is a short many-sided prism across the vehicle's width. Wheels tucked
// in under a body go in its `under` mesh, drawn just before it and sorted among themselves, so a far wheel never
// covers a near one; wheels flush with the body's sides go in its `sides`, drawn before or after it by which side
// faces the camera.

import { MeshBuilder, type Mesh } from '../mesh';

/** Material slot of the tyres (dark), as in meshes.ts. */
const TYRE = 2;

/** A tyre's profile in (l, z): a circle of radius `r` standing on the ground, as a polygon. */
function tyre(r: number, sides: number) {
  return Array.from({ length: sides }, (_, i) => {
    const a = ((i + 0.5) / sides) * Math.PI * 2;
    return [Math.cos(a) * r, r + Math.sin(a) * r];
  });
}

/**
 * A tyre on each axle at `axles` (along the body), of radius `r`, reaching from `w0` to `w1` out from the centre
 * line on each of `sides` (1 for the +w flank, -1 for the -w flank).
 */
export function addWheels(m: MeshBuilder, axles: readonly number[], r: number, w0: number, w1: number, sides: readonly number[] = [1, -1]) {
  const t = tyre(r, 10);
  for (const L of axles) for (const s of sides) m.extrude(t.map(([l, z]) => [l + L, z]), s * w0, s * w1, [TYRE], TYRE);
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

/**
 * A body's `sides`: its wheels on the +w flank and on the -w flank, each with an aero cover of radius `cover` in
 * material slot `coverMat` on its outer face.
 */
export function wheelSides(axles: readonly number[], r: number, w0: number, w1: number, cover: number, coverMat: number): readonly [Mesh, Mesh] {
  const flank = (s: number) => {
    const m = new MeshBuilder();
    addWheels(m, axles, r, w0, w1, [s]);
    for (const L of axles) {
      const disc = Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return [L + Math.cos(a) * cover, s * (w1 + 0.005), r + Math.sin(a) * cover];
      });
      m.decal(disc, coverMat, 0, s, 0);
    }
    return m.build(true);
  };
  return [flank(1), flank(-1)];
}
