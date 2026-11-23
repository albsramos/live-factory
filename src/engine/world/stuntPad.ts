// An Easter egg in the top-right corner of wide views: a clearing in the north belt's trees, just north of the
// Megapack field, with a paved pad where a roadster shows off for a ring of Optimus. Every 20 seconds one of the
// robots walks up to the car and back, then the car lifts on its thrusters and does a trick (a flat spin, a barrel
// roll, or a corkscrew that rolls and turns half round at once) and sets down again, raising smoke as it lifts and
// lands. Two more roadsters stand parked at the back. It is off the roads and draws from a random stream of its own.

import type { Activity, Env } from '../activities/activity';
import { C, rr } from '../core';
import type { Ctx, R } from '../draw';
import { arcPts, blobShadow, groundPoly, groundRect, rectShadow } from '../ground';
import { drawMesh } from '../mesh';
import { Walker } from '../people/walker';
import type { Item } from '../sort';
import { FnItem } from '../statics';
import { drawJets, Puffs } from '../traffic/exhaust';
import { ROLL_Z } from '../traffic/hop';
import { MESH } from '../traffic/meshes';
import type { Vehicle } from '../traffic/vehicle';

/** the pad: its centre, where the car does its tricks, and its paved extent */
export const PAD = { x: 93, y: -57, x0: 83, y0: -66, x1: 103, y1: -48.8 };
/** the driveway from the avenue's east kerb to the pad, drawn with the roads so it is kerbed like them */
export const PAD_DRIVE = { x0: 75.5, y0: -60.8, x1: 83.4, y1: -56.6 };
const PERIOD = 20;
/** seconds into each period when the trick starts, and how long it takes */
const START = 10, TRICK = 6.4;
type Trick = 'spin' | 'roll' | 'corkscrew';
const TRICKS: Trick[] = ['spin', 'roll', 'corkscrew'];

const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

export function buildStuntPad(env: Env): { act: Activity; ground(ctx: Ctx): void } {
  const { pal, statics: S, rng } = env;
  const mats = () => [pal.paints[0], pal.tintGlass, pal.tyre, pal.headlight, pal.taillight, pal.white, pal.robot, pal.robotHead];

  // two parked at the back of the pad
  for (const [x, y] of [[85.5, -62], [100.5, -62]]) {
    S.push(new FnItem(x - 1.1, y - 2.4, 0, x + 1.1, y + 2.4, 1.3, (r) => drawMesh(r, MESH.roadster, x, y, 0, 0, -1, mats()), (ctx) =>
      rectShadow(ctx, x, y, 0, -1, 2.2, 0.95, 1.1)).still());
  }

  // the crowd: five robots round the pad, facing the car, and one that walks up to it before each trick
  const watch = (a: number, rad: number) => [PAD.x + Math.cos(a) * rad, PAD.y + Math.sin(a) * rad];
  for (const deg of [10, 55, 100, 145, 215]) {
    const [x, y] = watch((deg * Math.PI) / 180, 6.2);
    const w = new Walker('robot', pal, rng, x, y);
    w.face(PAD.x - x, PAD.y - y);
    env.crowd.add(w);
  }
  const [hx0, hy0] = watch((175 * Math.PI) / 180, 6.2);
  const handler = new Walker('robot', pal, rng, hx0, hy0);
  handler.face(1, 0);
  env.crowd.add(handler);

  // the car, as a vehicle-shaped object so the thrusters' jets can be drawn on it as they are on the avenue's roadster
  const car = { x: PAD.x, y: PAD.y, z: 0, hx: 1, hy: 0, roll: 0, id: 7, pal, hop: { down: 0, back: 0 } };
  const puffs = new Puffs(pal);
  let t = rng() * 4, trick: Trick = 'spin', heading = 0, flying = false;

  const item: Item = {
    x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0,
    draw: (r: R) => {
      const v = car as unknown as Vehicle;
      drawJets(r, v, 'under');
      drawMesh(r, MESH.roadster, car.x, car.y, car.z, car.hx, car.hy, mats(), car.roll, ROLL_Z);
      drawJets(r, v, 'over');
    },
  };

  const update = (dt: number) => {
    const before = t % PERIOD;
    t += dt;
    const k = t % PERIOD;
    // a new period: the handler walks up beside the car, checks it over and walks back
    if (k < before) {
      trick = TRICKS[Math.floor(rng() * TRICKS.length)];
      handler.go([{ x: PAD.x - 1.2, y: PAD.y + 2.0, wait: 1.6, face: [0.4, -1] }, { x: hx0, y: hy0, face: [1, 0] }]);
    }
    const u = (k - START) / TRICK;
    let z = 0, roll = 0, turn = 0, down = 0;
    if (u > 0 && u < 1) {
      // up (0–0.2), the trick (0.2–0.75), down (0.75–1)
      const lift = u < 0.2 ? smooth(u / 0.2) : u > 0.75 ? 1 - smooth((u - 0.75) / 0.25) : 1;
      const m = smooth((u - 0.2) / 0.55);
      const top = trick === 'spin' ? 2.4 : trick === 'roll' ? 3.4 : 3.8;
      z = top * lift;
      if (trick === 'spin') turn = Math.PI * 2 * m;
      if (trick === 'roll') roll = Math.PI * 2 * m;
      if (trick === 'corkscrew') {
        roll = Math.PI * 2 * m;
        turn = Math.PI * m;
      }
      down = u < 0.2 || u > 0.75 ? 1 : 0.55;
      // smoke off the pad as it lifts and as it lands
      if ((u < 0.18 || u > 0.82) && rng() < dt * 30) {
        const a = rng() * Math.PI * 2, sp = rr(rng, 1.2, 2.6);
        puffs.emit(car.x + Math.cos(a) * 0.8, car.y + Math.sin(a) * 0.8, 0.2, 0.25, rr(rng, 0.9, 1.5), rr(rng, 1.2, 2), Math.cos(a) * sp, Math.sin(a) * sp, 0.35);
      }
      flying = true;
    } else if (flying) {
      // landed: the corkscrew leaves it facing the other way
      flying = false;
      if (trick === 'corkscrew') heading += Math.PI;
    }
    const a = heading + turn;
    car.hx = Math.cos(a);
    car.hy = Math.sin(a);
    car.z = z;
    car.roll = roll;
    car.hop.down = down;
    puffs.update(dt);
  };

  const act: Activity = {
    update,
    items(out: Item[]) {
      // its box: turned any way and rolled, a body reaches about 2.5 m round its centre
      const rad = car.z > 0.05 ? 2.7 : Math.abs(car.hx) * 2.3 + Math.abs(car.hy) * 1.0;
      const rad2 = car.z > 0.05 ? 2.7 : Math.abs(car.hy) * 2.3 + Math.abs(car.hx) * 1.0;
      item.x0 = car.x - rad;
      item.x1 = car.x + rad;
      item.y0 = car.y - rad2;
      item.y1 = car.y + rad2;
      item.z0 = car.z;
      item.z1 = car.z + 1.4 + (car.roll ? 1.2 : 0);
      out.push(item);
      puffs.items(out);
    },
    shadows(ctx: Ctx) {
      if (car.z < 0.05) rectShadow(ctx, car.x, car.y, car.hx, car.hy, 2.2, 0.95, 1.1);
      else blobShadow(ctx, car.x, car.y, Math.max(0.9, 2.2 - car.z * 0.25), 1);
    },
  };

  const ground = (ctx: Ctx) => {
    ctx.fillStyle = pal.pad;
    ctx.beginPath();
    groundRect(ctx, PAD.x0, PAD.y0, PAD.x1, PAD.y1);
    ctx.fill();
    // the landing circle, and a short line where the car sets down
    ctx.strokeStyle = pal.roadLine;
    ctx.lineWidth = 0.16;
    ctx.beginPath();
    groundPoly(ctx, arcPts(PAD.x, PAD.y, 3.6, 0, Math.PI * 2, 40));
    ctx.stroke();
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    groundPoly(ctx, arcPts(PAD.x, PAD.y, 4.1, 0, Math.PI * 2, 44));
    ctx.stroke();
    const X = (PAD.x - PAD.y) * C, Y = (PAD.x + PAD.y) * 0.5;
    ctx.fillStyle = pal.roadLine;
    ctx.beginPath();
    ctx.arc(X, Y, 0.12, 0, Math.PI * 2);
    ctx.fill();
  };

  return { act, ground };
}
