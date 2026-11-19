// The factory's main entrance on the plaza: a two-storey glazed front set on the factory's east face. Upstairs, a
// band of glass over a dark fascia (left blank: the scene shows no lettering); below it, the ground floor's glass is
// set back under the floor above, slim columns along the edge, with a dark doorway in the middle where people come
// and go (the walkway's door node).

import { onFaceX, onFaceY } from '../draw';
import { BoxItem } from '../statics';
import { windowsX, windowsY, type Band, type LitFace } from '../details';
import type { Env } from '../activities/activity';

/** the doorway, just in front of the recessed ground floor (a walker standing here must not overlap its box) */
export const ENTRANCE_DOOR = { x: 29.0, y: 58.0 };

const X0 = 26, X1 = 30.6, Y0 = 52.4, Y1 = 63.6;
/** the set-back ground floor's front */
const GX = 28.6;
const FLOOR = 4.0, TOP = 8.4;

export function entrance(env: Env, edge: string) {
  const { pal, statics: S } = env;
  // upstairs: glazing above, the dark fascia below it
  const upper: Band[] = [{ top: 0.3, bot: 2.9, every: 0.9 }];
  const fascia = (ctx: CanvasRenderingContext2D, w: number) => {
    ctx.fillStyle = pal.factoryDark.right;
    ctx.fillRect(0, 3.05, w, TOP - FLOOR - 3.05);
  };
  S.push(
    new BoxItem(X0, Y0, FLOOR, X1, Y1, TOP, pal.factory, { edge }, (r) => {
      windowsX(r, pal, X1, Y0, Y1, TOP, upper);
      windowsY(r, pal, X0, X1, Y1, TOP, upper);
      onFaceX(r, X1, Y0, Y1, TOP, fascia);
      onFaceY(r, X0, X1, Y1, TOP, fascia);
    }),
  );
  // the ground floor, set back: glass either side of the dark doorway (u runs from y1 towards y0 on the +x face)
  const gy0 = Y0 + 0.6, gy1 = Y1 - 0.6, door = gy1 - ENTRANCE_DOOR.y;
  const ground: Band[] = [
    { top: 0.25, bot: FLOOR - 0.05, every: 0.9, spans: [[0.2, door - 1.3], [door + 1.3, gy1 - gy0 - 0.2]] },
    { top: 0.9, bot: FLOOR - 0.02, every: 0.85, spans: [[door - 1.2, door + 1.2]], dark: true },
  ];
  S.push(
    new BoxItem(X0, gy0, 0, GX, gy1, FLOOR, pal.factory, { edge }, (r) => {
      windowsX(r, pal, GX, gy0, gy1, FLOOR, ground);
      windowsY(r, pal, X0, GX, gy1, FLOOR, [{ top: 0.25, bot: FLOOR - 0.05, every: 0.9 }]);
    }),
  );
  // slim columns along the front edge, clear of the walk to the door
  for (const y of [Y0 + 0.3, 55.4, 60.6, Y1 - 0.3]) S.push(new BoxItem(X1 - 0.42, y - 0.11, 0, X1 - 0.2, y + 0.11, FLOOR, pal.white));
}

/** The entrance's glazed faces, for the light they throw on the plaza at night (see windowSpill). */
export const ENTRANCE_FACES: LitFace[] = [
  [X1, Y0, X1, Y1, 1, 0],
  [GX, Y0 + 0.6, GX, Y1 - 0.6, 1, 0],
];
