// Inside the dock wing, seen in two places. Where the wing grows out in glass over the compute, its +x face is open
// to the extension (no wall or window between them): a storeroom, its far wall lined with shelves of boxes, where two
// Optimus robots carry boxes in from the dock side and put them away. And through an open garage between the second
// dock and the bay, the boxes the yard robots take out to the pallets. Both are drawn on the wing's face, clipped to
// their openings, like the main entrance's recess: the robots inside are within the wing's box, so as items of their
// own they couldn't be sorted.

import { makeRng, sx, sy } from '../core';
import { box, onFaceX, onTop, type R } from '../draw';
import type { Palette } from '../palette';
import { Walker, type Step } from '../people/walker';
import type { Activity } from '../activities/activity';

/** The wing's +x face (x 30) is open to the glass extension from y 26.4 to 36, floor to roof (10 m). */
const X = 30, Y0 = 26.4, Y1 = 36, H = 10;
/**
 * The storeroom's far wall, 4 m in (anything much deeper would show only its foot, at this angle), and the shelving
 * along it.
 */
const BACK = 26;
const SHELF = { x0: 26.1, x1: 27.3, top: 4.4, levels: [0.9, 1.8, 2.7, 3.6] };
/** The open garage between the second dock (y 10.5) and the bay (16.5): its sides along the face, and its height. */
export const GARAGE = { y0: 12.3, y1: 14.7, h: 3.4 };

export class DockInterior implements Activity {
  private bots: Walker[];
  private loops: Step[][];

  constructor(private pal: Palette, seed: number) {
    // on a random stream of their own, so the rest of the seeded scene stays as it was
    const rng = makeRng(seed);
    const carry = (on: boolean) => (w: Walker) => (w.carry = on);
    // pick up from the boxes come in from the docks, at the north end; put away on the shelves, turned to face them
    this.loops = [28.4, 29.2].map((x, i) => [
      { x, y: 28.1, wait: 0.9 + i * 0.4, face: [0, -1], then: carry(true) },
      { x, y: 31.4 + i * 1.6, wait: 1.0 + i * 0.3, face: [-1, 0], then: carry(false) },
    ]);
    this.bots = this.loops.map((loop, i) => new Walker('robot', pal, rng, loop[0].x, i ? 31.5 : 29.5));
  }

  update(dt: number) {
    this.bots.forEach((w, i) => {
      // a fresh copy each round: the walker uses its steps up as it goes
      if (!w.steps.length && w.waitT <= 0) w.go([...this.loops[i]]);
      w.update(dt);
    });
  }

  /** The storeroom, open to the glass extension: call it from the wing's live overlay. */
  draw(r: R) {
    const pal = this.pal;
    room(r, pal, Y0, Y1, H, () => {
      // the shelving along the back wall: uprights, and boxes on each level (some gaps)
      for (let y = Y0 - 2; y < Y1; y += 2.4) {
        for (const z of [0.1, ...SHELF.levels]) {
          box(r, SHELF.x0, y + 0.08, z - 0.06, SHELF.x1, y + 2.4, z, pal.steel);
          for (let k = 0; k < 3; k++) if ((Math.round(y * 5) + k * 3 + Math.round(z * 10)) % 4 > 0) box(r, SHELF.x0 + 0.12, y + 0.22 + k * 0.74, z, SHELF.x1 - 0.12, y + 0.84 + k * 0.74, z + 0.55, pal.crate);
        }
        box(r, SHELF.x0, y + 2.4, 0, SHELF.x1, y + 2.48, SHELF.top, pal.steel);
      }
      // the boxes come in from the docks, waiting to be put away
      for (let i = 0; i < 3; i++) box(r, 27.9, 26.7, i * 0.5, 29.7, 27.5, (i + 1) * 0.5, pal.crate);
      // the robots, back to front
      for (const w of [...this.bots].sort((a, b) => a.x + a.y - (b.x + b.y))) w.draw(r);
    });
  }

  /** The open garage by the docks, boxes stacked just inside it and its door rolled up: from the live overlay too. */
  drawGarage(r: R) {
    const pal = this.pal, { y0, y1, h } = GARAGE;
    room(r, pal, y0, y1, h, () => {
      for (let i = 0; i < 3; i++) box(r, 28.2, y0 + 0.3, i * 0.5, 29.4, y1 - 0.3, (i + 1) * 0.5, pal.crate);
    });
    // the door, rolled up into a drum under the lintel
    onFaceX(r, X, y0, y1, h, (c, w) => {
      c.fillStyle = pal.dockDoor;
      c.fillRect(0, 0, w, 0.32);
      c.fillStyle = pal.night ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.16)';
      c.fillRect(0, 0.26, w, 0.05);
    });
  }
}

/** A room inside the wing seen through its +x face from y0 to y1, up to height h: clip to that opening, then draw the
 * far wall, the floor, what `fill` adds, and at night the room's light. */
function room(r: R, pal: Palette, y0: number, y1: number, h: number, fill: () => void) {
  const ctx = r.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(sx(X, y1), sy(X, y1, h));
  ctx.lineTo(sx(X, y0), sy(X, y0, h));
  ctx.lineTo(sx(X, y0), sy(X, y0, 0));
  ctx.lineTo(sx(X, y1), sy(X, y1, 0));
  ctx.closePath();
  ctx.clip();
  onFaceX(r, BACK, y0 - 6, y1 + 6, H, (c, w) => {
    c.fillStyle = pal.interiorWall;
    c.fillRect(0, 0, w, H);
  });
  onTop(r, BACK, y0 - 6, 0, (c) => {
    c.fillStyle = pal.interiorFloor;
    c.fillRect(0, 0, X - BACK, y1 - y0 + 12);
  });
  fill();
  if (r.night) {
    // lit inside: a warm wash over the room
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255, 186, 104, 0.22)';
    ctx.fillRect(sx(X, y1) - 50, sy(X, y1, h) - 50, 200, 200);
  }
  ctx.restore();
}
