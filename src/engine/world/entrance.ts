// The factory's main entrance on the plaza: the ground floor is dented into the building under the flush facade
// above, like a covered porch. Above it runs a dark fascia (left blank: the scene shows no lettering); slim columns
// stand on the face line holding the floor above; behind them, set back, the glass front with a dark doorway, the glass
// wrapping round into the recess's side.
//
// The recess is painted onto the factory's +x face, which is exact for this camera: a point d metres inside the face
// lands where the face point (y + d, z + d) would, so the inner glass, the floor and the visible side wall are the
// face's own drawing shifted up and left by d, clipped to the opening. People walk up to the doorway's front and in
// at the walkway's door node; nobody stands inside the recess, so nothing has to sort into the building.

import type { Ctx, R } from '../draw';
import { ribbons, windowGlow, type Band } from '../details';
import type { Palette } from '../palette';

/** where people go in and out, just in front of the face */
export const ENTRANCE_DOOR = { x: 26.7, y: 58.0 };

/**
 * The opening along the face (y), its height and how far the glass is set back. The fascia spans a little more:
 * past the opening's end at Y0, the last bay (from FY0) is glazed flush with the facade (the factory's own band).
 */
const Y0 = 55.4, Y1 = 63.6, H = 4.0, D = 1.8, FY0 = 52.4;

/**
 * Draw the recessed entrance on the factory's +x face, inside that face's transform (u along the face from
 * y = faceY1, v down from the top at faceTop).
 */
export function drawEntrance(r: R, pal: Palette, ctx: Ctx, faceY1: number, faceTop: number) {
  const u0 = faceY1 - Y1, u1 = faceY1 - Y0, v0 = faceTop - H, v1 = faceTop;
  ctx.save();
  ctx.beginPath();
  ctx.rect(u0, v0, u1 - u0, v1 - v0);
  ctx.clip();
  // the porch floor, which fills the lower part of the opening
  ctx.fillStyle = pal.plaza;
  ctx.fillRect(u0, v0, u1 - u0, v1 - v0);
  // the set-back glass front: the face's own glazing, shifted by the depth
  ctx.save();
  ctx.translate(-D, -D);
  const door = faceY1 - ENTRANCE_DOOR.y;
  const glass: Band[] = [
    { top: v0 + 0.15, bot: v1, every: 0.9, spans: [[u0, door - 1.2], [door + 1.2, u1]] },
    { top: v0 + 0.7, bot: v1, every: 0.8, spans: [[door - 1.2, door + 1.2]], dark: true },
  ];
  ribbons(r, pal, ctx, u1, glass);
  windowGlow(r, ctx, u1, glass);
  ctx.restore();
  // the side wall at y = Y0, facing the camera: glass too, wrapping round from the front. Mapped so its local
  // t runs inwards from the face (u = u1 - t, v = v - t), so ribbons draws it with upright mullions.
  ctx.save();
  ctx.transform(-1, -1, 0, 1, u1, 0);
  const side: Band[] = [{ top: v0 + 0.15, bot: v1, every: 0.9, spans: [[0, D]] }];
  ctx.fillStyle = pal.factory.left;
  ctx.fillRect(0, v0, D, H);
  ribbons(r, pal, ctx, D, side);
  windowGlow(r, ctx, D, side);
  ctx.restore();
  // the shade under the floor above, deepest at the back
  const g = ctx.createLinearGradient(0, v0, 0, v1);
  g.addColorStop(0, r.night ? 'rgba(0, 0, 0, 0.25)' : 'rgba(40, 42, 56, 0.22)');
  g.addColorStop(1, 'rgba(40, 42, 56, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(u0, v0, u1 - u0, v1 - v0);
  // columns on the face line, clear of the doorway
  ctx.fillStyle = pal.white.right;
  for (const y of [Y0 + 0.13, 60.6, Y1 - 0.35]) ctx.fillRect(faceY1 - y - 0.13, v0, 0.26, H);
  ctx.restore();
  // the fascia over the opening and the flush bay beside it
  ctx.fillStyle = pal.factoryDark.right;
  ctx.fillRect(u0 - 0.3, v0 - 1.15, faceY1 - FY0 - u0 + 0.6, 1.05);
}
