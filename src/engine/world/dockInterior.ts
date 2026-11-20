// Inside the dock wing, seen through its tall atrium window (which the glass extension over the compute now stands in
// front of): a storeroom behind the glass, its far wall lined with shelves of boxes, and two Optimus robots carrying
// boxes in from the dock side, where the trucks unload, and stacking them on the shelves. Drawn as part of the wing's face, clipped to the window, like the main
// entrance's recess: the robots are inside the wing's box, so as items of their own they couldn't be sorted.

import { makeRng, sx, sy } from '../core';
import { box, onFaceX, onTop, type R } from '../draw';
import { atrium } from '../details';
import type { Palette } from '../palette';
import { Walker, type Step } from '../people/walker';
import type { Activity } from '../activities/activity';

/** The window on the wing's +x face (x 30): along it from y 26.6 to 35.4, from z 0.3 up to 8.6. */
const X = 30, Y0 = 26.6, Y1 = 35.4, Z0 = 0.3, Z1 = 8.6;
/**
 * The storeroom's far wall, 4 m in (anything much deeper would show only its foot through the window, at this
 * angle), and the shelving along it.
 */
const BACK = 26;
const SHELF = { x0: 26.1, x1: 27.3, top: 4.4, levels: [0.9, 1.8, 2.7, 3.6] };

export class DockInterior implements Activity {
  private bots: Walker[];
  private loops: Step[][];

  constructor(private pal: Palette, seed: number) {
    // on a random stream of their own, so the rest of the seeded scene stays as it was
    const rng = makeRng(seed);
    const carry = (on: boolean) => (w: Walker) => (w.carry = on);
    // pick up at the north end, by the docks; put away on the shelves, turned to face them
    this.loops = [28.4, 29.2].map((x, i) => [
      { x, y: 27.2, wait: 0.9 + i * 0.4, face: [0, -1], then: carry(true) },
      { x, y: 31.4 + i * 1.6, wait: 1.0 + i * 0.3, face: [-1, 0], then: carry(false) },
    ]);
    this.bots = this.loops.map((loop, i) => new Walker('robot', pal, rng, loop[0].x, i ? 31.5 : 29.5));
  }

  update(dt: number) {
    this.bots.forEach((w, i) => {
      if (!w.steps.length && w.waitT <= 0) w.go(this.loops[i]);
      w.update(dt);
    });
  }

  /** The view in through the window: call it from the wing's live overlay. */
  draw(r: R) {
    const pal = this.pal, ctx = r.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx(X, Y1), sy(X, Y1, Z1));
    ctx.lineTo(sx(X, Y0), sy(X, Y0, Z1));
    ctx.lineTo(sx(X, Y0), sy(X, Y0, Z0));
    ctx.lineTo(sx(X, Y1), sy(X, Y1, Z0));
    ctx.closePath();
    ctx.clip();
    // the hall inside: its back wall and its floor
    onFaceX(r, BACK, Y0 - 6, Y1 + 6, 10, (c, w) => {
      c.fillStyle = pal.interiorWall;
      c.fillRect(0, 0, w, 10);
    });
    onTop(r, BACK, Y0 - 6, 0, (c) => {
      c.fillStyle = pal.interiorFloor;
      c.fillRect(0, 0, X - BACK, Y1 - Y0 + 12);
    });
    // the shelving along the back wall: uprights, and boxes on each level (some gaps)
    for (let y = Y0 - 4; y < Y1; y += 2.4) {
      for (const z of [0.1, ...SHELF.levels]) {
        box(r, SHELF.x0, y + 0.08, z - 0.06, SHELF.x1, y + 2.4, z, pal.steel);
        for (let k = 0; k < 3; k++) if ((Math.round(y * 5) + k * 3 + Math.round(z * 10)) % 4 > 0) box(r, SHELF.x0 + 0.12, y + 0.22 + k * 0.74, z, SHELF.x1 - 0.12, y + 0.84 + k * 0.74, z + 0.55, pal.crate);
      }
      box(r, SHELF.x0, y + 2.4, 0, SHELF.x1, y + 2.48, SHELF.top, pal.steel);
    }
    // the robots, back to front
    for (const w of [...this.bots].sort((a, b) => a.x + a.y - (b.x + b.y))) w.draw(r);
    ctx.restore();
    // and the glass over it all, now see-through
    atrium(r, pal, X, 0, 36, 10, 0.6, 9.4, 1.4, 9.7, true);
  }
}
