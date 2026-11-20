// Inside the dock wing, seen in two places. Where the wing grows out in glass over the compute, its +x face is open
// to the extension (no wall or window between them): a storeroom, its far wall lined with shelves of boxes, where three
// Optimus robots come in from the dock side with boxes, put them away, take others off the shelves and carry them
// out the other way. And through an open garage between the second
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

/** Where the storeroom's robots come in, from the dock side out of view to the north, and leave, out of view to the
 * south: past the ends of the open face (y 26.4 to 36), the wing's wall hides them. */
const ENTER_Y = 23.5, LEAVE_Y = 38.8;

export class DockInterior implements Activity {
  private bots: Walker[];
  private rounds: Step[][];
  private rng: () => number;

  constructor(private pal: Palette, seed: number) {
    // on a random stream of their own, so the rest of the seeded scene stays as it was
    this.rng = makeRng(seed);
    const carry = (on: boolean) => (w: Walker) => (w.carry = on);
    // three robots, each on a lane of its own: in from the north with a box, put it on the shelves, take another box
    // off them further along, and out to the south with it
    this.rounds = [
      [28.2, 29.2, 33.4],
      [28.9, 31.0, 34.2],
      [29.6, 30.0, 32.4],
    ].map(([x, drop, pick]) => [
      { x, y: drop, wait: 1.0, face: [-1, 0], then: carry(false) },
      { x, y: pick, wait: 0.9, face: [-1, 0], then: carry(true) },
      { x, y: LEAVE_Y },
    ]);
    // spread out along their rounds for the opening frame
    this.bots = this.rounds.map((round, i) => {
      const w = new Walker('robot', pal, this.rng, round[0].x, [ENTER_Y + 2, 32, 26][i]);
      w.carry = i !== 1;
      w.go(i === 1 ? round.slice(1) : [...round]);
      return w;
    });
  }

  update(dt: number) {
    this.bots.forEach((w, i) => {
      if (!w.steps.length && w.waitT <= 0) {
        // out of view to the south: back in at the north with a fresh box, after a while
        w.x = this.rounds[i][0].x;
        w.y = ENTER_Y;
        w.carry = true;
        w.waitT = 1 + this.rng() * 3;
        // a fresh copy each round: the walker uses its steps up as it goes
        w.go([...this.rounds[i]]);
      }
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
