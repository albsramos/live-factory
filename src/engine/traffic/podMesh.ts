// The robotaxi pod, a two-seat coupe: a long, low hood under a thin light bar across the nose, a raked windscreen and
// side glass under a roof in the body's paint, a long fastback down to a cut-off tail with a light bar across it,
// black lower bumpers and sills, and big wheels flush with the flanks under covers in the body's paint. Its doors
// lift up (drawn by `drawDoors` in vehicleItem.ts, over the side glass). Material slots as in meshes.ts: 0 paint,
// 1 glass, 2 dark, 3 head light, 4 tail light.

import { MeshBuilder, type Mesh } from '../mesh';
import { SlicedBody, plan } from './bodyKit';
import { wheelSides } from './wheels';

/** The body's slices, bottom up: [height, front, back, half width, front corner radius, back corner radius]. */
const SLICES: [number, number, number, number, number, number][] = [
  [0.2, 1.84, -1.86, 0.9, 0.5, 0.26], // the foot of the black bumpers and sills
  [0.42, 1.92, -1.92, 0.95, 0.56, 0.28],
  [0.62, 1.92, -1.92, 0.96, 0.6, 0.28], // the front light bar's line
  [0.7, 1.72, -1.92, 0.95, 0.62, 0.28], // round over the nose; the top of the cut-off tail
  [0.8, 0.9, -1.86, 0.92, 0.6, 0.27], // the long hood up to the windscreen's foot; the edge of the tail
  [1.05, 0.38, -1.55, 0.83, 0.5, 0.3], // glass from here up, front and sides
  [1.25, -0.02, -1.15, 0.72, 0.42, 0.3], // the windscreen's top
  [1.33, -0.28, -0.82, 0.62, 0.32, 0.26], // the roof
];
/** black up to the sills, paint above; the glass is laid on as decals */
const MATS = [2, 0, 0, 0, 0, 0, 0];
/** wheel centres along the body, and the wheels' radius */
const AXLES = [1.25, -1.25];
const R = 0.34;

/** Each band's decals, laid right after the band (see `SlicedBody`). */
function decorate(body: SlicedBody, band: number) {
  // the thin light bar right across the nose, wrapping round its corners
  if (band === 1) for (const f of body.band(1)) if (f.place === 'front' || f.place === 'frontCorner') body.rect(f, 0, 1, 0.86, 0.95, 3);
  // the light bar across the cut-off tail, wrapping onto its corners
  if (band === 2) for (const f of body.band(2)) if (f.place === 'rear' || f.place === 'rearCorner') body.rect(f, 0, 1, 0.3, 0.75, 4);
  // the windscreen round the front, and the side glass back to the rear pillar, which leans with the fastback
  if (band === 4 || band === 5) {
    // the window's back edge at the foot and the top of each band: back nearly to the rear wheel, leaning forward
    const [back, backTop] = band === 4 ? [-0.95, -0.8] : [-0.8, -0.62];
    // the upper band's glass (drawn after the lower band) reaches a little down over the lower one's, so no paint
    // shows along the joint
    const foot = band === 5 ? -0.06 : 0;
    for (const f of body.band(band)) {
      if (f.place === 'front' || f.place === 'frontCorner') body.rect(f, 0, 1, foot, 1, 1);
      else if (f.place === 'side') {
        // the face runs front to back on one side of the car and back to front on the other
        const front = f.pts[0][0] > f.pts[1][0] ? 0 : 1;
        body.poly(f, [[front, foot], [body.uAt(f, back), foot], [body.uAt(f, backTop, true), 1], [front, 1]], 1);
      }
    }
  }
}

export function podMesh(): Mesh {
  const m = new MeshBuilder();
  new SlicedBody(m, SLICES.map(([z, lf, lr, w, rf, rr]) => ({ z, pts: plan(lf, lr, w, rf, rr) })), MATS, decorate);
  // a small underbody tucked in under the sills, and the big wheels flush with the flanks, under covers in the paint
  const u = new MeshBuilder(), base = plan(1.6, -1.6, 0.6, 0.4, 0.4);
  u.frustum(base, 0.1, base, 0.22, 2, 2);
  // the wheels are thin, their covers flush with the body's flanks (0.96), which hide the rest of them
  return { ...m.build(), under: u.build(), sides: wheelSides(AXLES, R, 0.92, 0.965, 0.26, 0) };
}
