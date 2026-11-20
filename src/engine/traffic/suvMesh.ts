// The SUV: a smooth crossover with a low, gently sloping hood under a thin light bar right across the nose, a dark
// glass greenhouse that runs from the windscreen over the roof into a fastback, a light bar across the tailgate, and
// dark wheel arches. Material slots as in meshes.ts: 0 paint, 1 glass, 2 dark, 3 head light, 4 tail light.

import { MeshBuilder, type Mesh } from '../mesh';
import { SlicedBody, plan } from './bodyKit';

/** The body's slices, bottom up: [height, front, back, half width, front corner radius, back corner radius]. */
const SLICES: [number, number, number, number, number, number][] = [
  [0.3, 2.34, -2.36, 0.97, 0.55, 0.5], // under the bumpers
  [0.6, 2.43, -2.42, 1.0, 0.6, 0.55], // the widest line, round the wheel arches
  [0.8, 2.41, -2.43, 1.0, 0.62, 0.56], // the front light bar
  [0.88, 2.22, -2.4, 0.99, 0.66, 0.56], // round over the nose
  [1.0, 1.12, -2.3, 0.95, 0.62, 0.52], // up the hood to the windscreen's foot; the shoulder line
  [1.3, 0.52, -2.1, 0.86, 0.55, 0.5], // glass from here up
  [1.5, 0.1, -1.62, 0.76, 0.45, 0.42],
  [1.62, -0.22, -1.08, 0.66, 0.36, 0.3], // the glass roof
];
/** paint up to the shoulder line, glass above */
const MATS = [0, 0, 0, 0, 1, 1, 1];
/** wheel centres along the body */
const AXLES = [1.4, -1.4];

export function suvMesh(): Mesh {
  const m = new MeshBuilder();
  // wheels and the dark sill under the body
  const box = (l0: number, l1: number, w: number) => [[l1, -w], [l1, w], [l0, w], [l0, -w]];
  m.frustum(box(-2.05, 2.05, 0.92), 0, box(-2.05, 2.05, 0.92), 0.34, 2, 2);
  const body = new SlicedBody(m, SLICES.map(([z, lf, lr, w, rf, rr]) => ({ z, pts: plan(lf, lr, w, rf, rr) })), MATS);

  // the lower band: a dark intake low across the nose, and a dark arch over each wheel
  for (const f of body.band(0)) {
    if (f.place === 'front') body.rect(f, 0.04, 0.96, 0.18, 0.62, 2);
    else if (f.place === 'side')
      for (const L of AXLES) {
        const arch: number[][] = [];
        for (let i = 0; i <= 6; i++) {
          const a = (i / 6) * Math.PI;
          // kept on the straight side, clear of the rounded corners
          arch.push([Math.max(0, Math.min(1, body.uAt(f, L + Math.cos(a) * 0.4))), Math.min(0.96, Math.sin(a) * 1.05)]);
        }
        body.poly(f, arch, 2);
      }
  }
  // the light bar right across the nose, a little thicker where it turns the corners as the headlamps
  for (const f of body.band(1)) {
    if (f.place === 'front') body.rect(f, 0, 1, 0.84, 0.93, 3);
    else if (f.place === 'frontCorner') body.rect(f, 0, 1, 0.78, 0.95, 3);
  }
  // the light bar across the tailgate, wrapping onto the back corners
  for (const f of body.band(3)) if (f.place === 'rear' || f.place === 'rearCorner') body.rect(f, 0, 1, 0.45, 0.78, 4);
  // stacked bottom up, so drawn in the order built
  return m.build();
}
