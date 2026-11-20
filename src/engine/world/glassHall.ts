// A glass hall over a compute platform: glass walls in a frame of the factory's clay and a glass roof on a grid of
// beams, so the racks stay dry and still show through. The walls and the roof are thin items of their own, all
// outside the racks' boxes (a front wall past their +x and +y sides, the back walls past their -x and -y sides, the
// roof above them), so the depth sort always knows the racks are inside. With `isAttached` the hall is the factory
// itself grown out in glass at its -x side: no wall of its own there, and a deep head band in the factory's clay.

import type { Ctx, R } from '../draw';
import { onFaceX, onFaceY, onTop } from '../draw';
import type { Palette } from '../palette';
import { BoxItem, FnItem } from '../statics';
import { Looper } from '../activities/looper';
import type { Activity, Env } from '../activities/activity';

export interface GlassHall {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** the walls' height, up to the roof */
  h: number;
  isAttached?: boolean;
  /** heights of the frame's horizontal rails across the glass; one transom at 62% of the height by default */
  rails?: number[];
}

/** mullion spacing on the walls and beam spacing on the roof, and the wall and roof thickness */
const BAY = 1.6, BEAM = 2.4, T = 0.06, ROOF = 0.14;

export function glassHall(pal: Palette, g: GlassHall): FnItem[] {
  const { x0, y0, x1, y1, h } = g;
  const items: FnItem[] = [];
  const f: Frame = { rails: g.rails ?? [h * 0.62], head: g.isAttached ? 0.5 : 0.16 };
  // the back walls first: we see them from inside, through the front glass, so only faintly
  items.push(new FnItem(x0, y0 - T, 0, x1, y0, h, (r) => onFaceY(r, x0, x1, y0, h, (c, w) => pane(r, pal, c, w, h, pal.factory.left, true, f))).still());
  if (!g.isAttached) items.push(new FnItem(x0 - T, y0, 0, x0, y1, h, (r) => onFaceX(r, x0, y0, y1, h, (c, w) => pane(r, pal, c, w, h, pal.factory.right, true, f))).still());
  // the front walls, facing the camera
  items.push(new FnItem(x1, y0, 0, x1 + T, y1 + T, h, (r) => onFaceX(r, x1 + T, y0, y1 + T, h, (c, w) => pane(r, pal, c, w, h, pal.factory.right, false, f))).still());
  items.push(new FnItem(x0, y1, 0, x1, y1 + T, h, (r) => onFaceY(r, x0, x1, y1 + T, h, (c, w) => pane(r, pal, c, w, h, pal.factory.left, false, f))).still());
  // the roof
  items.push(new FnItem(x0, y0, h, x1 + T, y1 + T, h + ROOF, (r) => roof(r, pal, x0, y0, x1 + T - x0, y1 + T - y0, h + ROOF)).still());
  return items;
}

/** Where a wall's frame has rails (heights from the ground) and how deep its head band is. */
interface Frame {
  rails: number[];
  head: number;
}

/** A glass wall w wide and h high: a light tint, mullions every BAY, rails across, and a frame round it. */
function pane(r: R, pal: Palette, c: Ctx, w: number, h: number, frame: string, isBack: boolean, f: Frame) {
  c.fillStyle = pal.hallGlass;
  c.globalAlpha = isBack ? 0.5 : 1;
  c.fillRect(0, 0, w, h);
  if (!isBack && !r.night) {
    // two soft bands of reflected daylight across the glass
    c.fillStyle = pal.hallSheen;
    for (const u of [0.18, 0.62]) {
      c.beginPath();
      c.moveTo(w * u, 0);
      c.lineTo(w * u + h * 0.5, 0);
      c.lineTo(w * u + h * 0.5 - h * 0.35, h);
      c.lineTo(w * u - h * 0.35, h);
      c.closePath();
      c.fill();
    }
  }
  c.strokeStyle = frame;
  c.lineWidth = 0.06;
  c.beginPath();
  for (let u = BAY; u < w - 0.2; u += BAY) {
    c.moveTo(u, 0);
    c.lineTo(u, h);
  }
  for (const z of f.rails) {
    c.moveTo(0, h - z);
    c.lineTo(w, h - z);
  }
  c.stroke();
  // the head and the sill, and the posts at the ends
  c.fillStyle = frame;
  c.fillRect(0, 0, w, f.head);
  c.fillRect(0, h - 0.12, w, 0.12);
  c.fillRect(0, 0, 0.1, h);
  c.fillRect(w - 0.1, 0, 0.1, h);
  c.globalAlpha = 1;
}

/** The glass roof seen from above: tinted glass on a grid of beams, framed round the edge. */
function roof(r: R, pal: Palette, x0: number, y0: number, w: number, d: number, z: number) {
  onTop(r, x0, y0, z, (c) => {
    c.fillStyle = pal.hallRoof;
    c.fillRect(0, 0, w, d);
    if (!r.night) {
      c.fillStyle = pal.hallSheen;
      c.fillRect(0, d * 0.15, w, d * 0.18);
    }
    c.strokeStyle = pal.factory.top;
    c.lineWidth = 0.08;
    c.beginPath();
    for (let p = BEAM; p < w - 0.2; p += BEAM) {
      c.moveTo(p, 0);
      c.lineTo(p, d);
    }
    for (let q = BEAM; q < d - 0.2; q += BEAM) {
      c.moveTo(0, q);
      c.lineTo(w, q);
    }
    c.stroke();
    c.lineWidth = 0.22;
    c.strokeRect(0.11, 0.11, w - 0.22, d - 0.22);
  });
}

/**
 * Inside the glass extension, in the strip between the last column of racks (x 49.7) and the glass by the truck yard
 * (x 54): a pallet stack of boxes at each end, one by the trucks and one at the front glass, and two Optimus robots
 * on lanes of their own carrying boxes from the one to the other. They stand on the platform (z 0.35).
 */
export function glassLoading(env: Env, edge: string): Activity[] {
  const { pal, statics: S } = env;
  const z = 0.35;
  for (const [y0, y1, layers] of [[26.9, 27.7, 3], [35.9, 36.7, 2]]) {
    for (let i = 0; i < layers; i++) S.push(new BoxItem(51.0, y0, z + i * 0.4, 53.0, y1, z + (i + 1) * 0.4, pal.crate, { edge }, undefined, false));
  }
  const carry = (on: boolean) => (w: { carry: boolean }) => (w.carry = on);
  return [51.4, 52.6].map((x, i) => {
    const pick = { x, y: 28.3, z, wait: 0.9 + i * 0.3, then: carry(true) }, drop = { x, y: 35.3, z, wait: 0.8 + i * 0.2, then: carry(false) };
    return new Looper(env, 'robot', () => (i ? [drop, pick] : [pick, drop]), x, i ? 34 : 29.5, z);
  });
}
