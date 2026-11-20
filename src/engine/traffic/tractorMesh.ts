// The semi's tractor: a tall aerodynamic cab built as a stack of horizontal slices, so its side profile (low rounded
// nose, raked wraparound windscreen, domed roof sweeping back to the trailer's height) comes from how far forward,
// how wide and how rounded each slice is. Material slots as in meshes.ts: 0 paint, 1 glass, 2 dark, 3 head light.

import { MeshBuilder, type Mesh } from '../mesh';
import { SlicedBody, plan } from './bodyKit';

/** Back of the cab, a little ahead of the trailer's nose (which sits at -1.0) so the two clear in a turn. */
const LR = -0.7;
/** the back corners' small radius */
const RB = 0.12;

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

export function tractorMesh(): Mesh {
  const m = new MeshBuilder();
  const box = (l0: number, l1: number, w: number) => [[l1, -w], [l1, w], [l0, w], [l0, -w]];
  // the front wheels and the frame under the cab (the rest is `chassisMesh`), and the black bumper wrapping the nose
  m.frustum(box(LR, 2.7, 0.92), 0, box(LR, 2.7, 0.92), 0.8, 2, 2);
  // the dark fairing in the gap between the cab and the trailer: built before the cab and a little narrower, so
  // the body always stands in front of it and it only shows in that gap
  m.frustum(box(-1.0, LR + 0.05, 1.14), 1.0, box(-1.0, LR + 0.05, 0.84), 3.88, 2, 2);
  const bumper = plan(3.08, LR, 1.2, 0.5, RB);
  m.frustum(bumper, 0.36, bumper, 0.8, 2, 2);

  // the cab: each slice to the next is one convex part
  const body = new SlicedBody(m, SLICES.map(([z, lf, w, rf]) => ({ z, pts: plan(lf, LR, w, rf, RB) })), SLICES.map(() => 0));

  // the windscreen wraps round the nose's corners and runs back along the sides as the door glass; its back edge
  // leans forward and its top corner is rounded
  const SCREEN = 3, WIN_BACK_LOW = 0.35, WIN_BACK_TOP = 0.7;
  for (const f of body.band(SCREEN)) {
    if (f.place === 'front' || f.place === 'frontCorner') body.rect(f, 0, 1, 0.02, 0.98, 1);
    else if (f.place === 'side') {
      // the face runs front to back on one side of the cab and back to front on the other: measure from its front
      const fwd = f.pts[0][0] > f.pts[1][0];
      const front = fwd ? 0 : 1;
      const low = body.uAt(f, WIN_BACK_LOW), top = body.uAt(f, WIN_BACK_TOP, true);
      // the back edge leans forward, and rounds into the top edge
      const back = (v: number) => low + (top - low) * v;
      const bend = fwd ? -0.08 : 0.08;
      body.poly(f, [[front, 0.02], [back(0.02), 0.02], [back(0.7), 0.7], [back(0.86) + bend * 0.5, 0.9], [back(0.98) + bend, 0.98], [front, 0.98]], 1);
    }
  }
  // the thin light bar right across the nose at its widest, and a brighter lamp where it turns the corner
  const BAR = 0;
  for (const f of body.band(BAR)) {
    if (f.place === 'front') body.rect(f, 0, 1, 0.86, 0.93, 3);
    else if (f.place === 'frontCorner') body.rect(f, 0, 1, 0.82, 0.95, 3);
  }
  // stacked bottom up, so drawn in the order built
  return m.build();
}

/**
 * The frame behind the cab, its drive wheels and the fifth-wheel plate, in the tractor's frame. The trailer rides
 * over it, so it is drawn with the trailer, just before it, rather than with the cab, which is drawn after.
 */
export function chassisMesh(): Mesh {
  const m = new MeshBuilder();
  const box = (l0: number, l1: number, w: number) => [[l1, -w], [l1, w], [l0, w], [l0, -w]];
  m.frustum(box(-3.0, LR, 0.92), 0, box(-3.0, LR, 0.92), 0.8, 2, 2);
  m.frustum(box(-2.5, -0.9, 0.7), 0.8, box(-2.5, -0.9, 0.7), 1.0, 2, 2);
  return m.build();
}

