// An Easter egg in the top-right corner of wide views: a clearing in the north belt's trees, just north of the
// carrier depot, with a paved pad where three roadsters take turns showing off for a ring of Optimus, each with a
// trick of its own: a flat spin, a barrel roll, or a corkscrew that rolls and turns half round at once. Every 20
// seconds the last one drives off the circle to a free spot at the back and the next reverses out onto it; a robot
// walks up and checks it over; then it lifts on its thrusters, does its trick and sets down, raising smoke as it lifts
// and lands. It is off the roads and draws from a random stream of its own.

import type { Activity, Env } from '../activities/activity';
import { C, rr } from '../core';
import type { Ctx, R } from '../draw';
import { arcPts, blobShadow, groundPoly, groundRect, rectShadow } from '../ground';
import { drawMesh } from '../mesh';
import type { Palette } from '../palette';
import { Walker } from '../people/walker';
import type { Item } from '../sort';
import { drawJets, Puffs } from '../traffic/exhaust';
import { ROLL_Z } from '../traffic/hop';
import { MESH } from '../traffic/meshes';
import type { Vehicle } from '../traffic/vehicle';

/** the pad: its centre, where the car does its tricks, and its paved extent */
export const PAD = { x: 93, y: -57, x0: 83, y0: -66, x1: 103, y1: -48.8 };
/** the driveway from the avenue's east kerb into the pad */
export const PAD_DRIVE = { x0: 75.5, y0: -60.8, x1: 83.4, y1: -56.6 };
/** parking spots along the back of the pad, cars nose north */
const SPOTS = [[86, -62.6], [93, -62.6], [100, -62.6]];
const PERIOD = 20;
/** within each period: the last car drives off (0–3 s), the next reverses on (3–6), the check (6–9.5), the trick */
const OUT = [0, 3], IN = [3, 6], CHECK = 6, START = 10, TRICK = 6.4;
type Trick = 'spin' | 'roll' | 'corkscrew';

const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** A point and the direction of travel along a cubic Bézier, at `u`. */
function bezier(p: number[][], u: number) {
  const v = 1 - u;
  const x = v * v * v * p[0][0] + 3 * v * v * u * p[1][0] + 3 * v * u * u * p[2][0] + u * u * u * p[3][0];
  const y = v * v * v * p[0][1] + 3 * v * v * u * p[1][1] + 3 * v * u * u * p[2][1] + u * u * u * p[3][1];
  const dx = 3 * v * v * (p[1][0] - p[0][0]) + 6 * v * u * (p[2][0] - p[1][0]) + 3 * u * u * (p[3][0] - p[2][0]);
  const dy = 3 * v * v * (p[1][1] - p[0][1]) + 6 * v * u * (p[2][1] - p[1][1]) + 3 * u * u * (p[3][1] - p[2][1]);
  const d = Math.hypot(dx, dy) || 1;
  return { x, y, dx: dx / d, dy: dy / d };
}

interface Car {
  x: number; y: number; z: number; hx: number; hy: number; roll: number; id: number; pal: Palette;
  hop: { down: number; back: number };
  trick: Trick; paint: number; spot: number; item: Item;
}

export function buildStuntPad(env: Env): { act: Activity } {
  const { pal, rng } = env;
  const puffs = new Puffs(pal);

  // three cars, each with its own paint and its own trick: one on the circle facing east, two parked at the back
  const cars: Car[] = ([['spin', 0, -1], ['roll', 1, 0], ['corkscrew', 2, 2]] as const).map(([trick, paint, spot], i) => {
    const at = spot < 0 ? [PAD.x, PAD.y] : SPOTS[spot];
    const car: Car = {
      x: at[0], y: at[1], z: 0, hx: spot < 0 ? 1 : 0, hy: spot < 0 ? 0 : -1, roll: 0, id: 70 + i, pal,
      hop: { down: 0, back: 0 }, trick, paint, spot,
      item: { x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0, draw: () => undefined },
    };
    car.item.draw = (r: R) => {
      const v = car as unknown as Vehicle;
      const mats = [pal.paints[car.paint], pal.tintGlass, pal.tyre, pal.headlight, pal.taillight, pal.white, pal.robot, pal.robotHead];
      drawJets(r, v, 'under');
      drawMesh(r, MESH.roadster, car.x, car.y, car.z, car.hx, car.hy, mats, car.roll, ROLL_Z);
      drawJets(r, v, 'over');
    };
    return car;
  });
  let star = 0, next = 1, free = 1;

  // the crowd: five robots on the south side, clear of the cars' ways on and off, and one that checks each car
  const watch = (deg: number, rad: number) => [PAD.x + Math.cos((deg * Math.PI) / 180) * rad, PAD.y + Math.sin((deg * Math.PI) / 180) * rad];
  for (const deg of [25, 60, 95, 130, 160]) {
    const [x, y] = watch(deg, 6.4);
    const w = new Walker('robot', pal, rng, x, y);
    w.face(PAD.x - x, PAD.y - y);
    env.crowd.add(w);
  }
  const [hx0, hy0] = watch(170, 7);
  const handler = new Walker('robot', pal, rng, hx0, hy0);
  handler.face(1, 0);
  env.crowd.add(handler);

  // start just after a car has come onto the circle, so the opening frames show it ready
  let t = CHECK + rng() * 2, heading = 0, flying = false, route: number[][] = [];

  const update = (dt: number) => {
    const before = t % PERIOD;
    t += dt;
    const k = t % PERIOD;
    const car = cars[star];
    if (k < before) {
      // a new turn: the star drives off forward to the free spot, arriving nose north
      const s = SPOTS[free];
      route = [[car.x, car.y], [car.x + car.hx * 3, car.y + car.hy * 3], [s[0], s[1] + 3], s];
    }
    if (k >= OUT[0] && k < OUT[1] && route.length) {
      const p = bezier(route, smooth((k - OUT[0]) / (OUT[1] - OUT[0])));
      Object.assign(car, { x: p.x, y: p.y, hx: p.dx, hy: p.dy });
    }
    if (before < OUT[1] && k >= OUT[1] && route.length) {
      // parked; the next car in line (the one that has waited longest) reverses out onto the circle, ending facing east
      const s = SPOTS[free];
      Object.assign(car, { x: s[0], y: s[1], hx: 0, hy: -1, spot: free });
      const nx = cars[next];
      free = nx.spot;
      nx.spot = -1;
      route = [[nx.x, nx.y], [nx.x, nx.y + 3], [PAD.x + 3, PAD.y], [PAD.x, PAD.y]];
      heading = 0;
      star = next;
      next = (next + 1) % cars.length;
      if (next === star) next = (next + 1) % cars.length;
    }
    const cur = cars[star];
    if (k >= IN[0] && k < IN[1] && route.length) {
      // reversing: it faces against its direction of travel
      const p = bezier(route, smooth((k - IN[0]) / (IN[1] - IN[0])));
      Object.assign(cur, { x: p.x, y: p.y, hx: -p.dx, hy: -p.dy });
    }
    if (before < IN[1] && k >= IN[1]) Object.assign(cur, { x: PAD.x, y: PAD.y, hx: 1, hy: 0 });
    // the check: a robot walks up beside it, looks it over and walks back
    if (before < CHECK && k >= CHECK) {
      handler.go([{ x: PAD.x - 1.2, y: PAD.y + 2.0, wait: 1.6, face: [0.4, -1] }, { x: hx0, y: hy0, face: [1, 0] }]);
    }
    const u = (k - START) / TRICK;
    let z = 0, roll = 0, turn = 0, down = 0;
    if (u > 0 && u < 1) {
      // up (0–0.2), the trick (0.2–0.75), down (0.75–1)
      const lift = u < 0.2 ? smooth(u / 0.2) : u > 0.75 ? 1 - smooth((u - 0.75) / 0.25) : 1;
      const m = smooth((u - 0.2) / 0.55);
      const trick = cur.trick;
      z = (trick === 'spin' ? 2.4 : trick === 'roll' ? 3.4 : 3.8) * lift;
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
        puffs.emit(cur.x + Math.cos(a) * 0.8, cur.y + Math.sin(a) * 0.8, 0.2, 0.25, rr(rng, 0.9, 1.5), rr(rng, 1.2, 2), Math.cos(a) * sp, Math.sin(a) * sp, 0.35);
      }
      flying = true;
      cur.hx = Math.cos(heading + turn);
      cur.hy = Math.sin(heading + turn);
    } else if (flying) {
      // landed: the corkscrew leaves it facing the other way
      flying = false;
      if (cur.trick === 'corkscrew') heading += Math.PI;
      cur.hx = Math.cos(heading);
      cur.hy = Math.sin(heading);
    }
    cur.z = z;
    cur.roll = roll;
    cur.hop.down = down;
    puffs.update(dt);
  };

  const act: Activity = {
    update,
    items(out: Item[]) {
      for (const car of cars) {
        // its box: turned any way and rolled, a body reaches about 2.5 m round its centre
        const up = car.z > 0.05;
        const rx = up ? 2.7 : Math.abs(car.hx) * 2.3 + Math.abs(car.hy) * 1.0;
        const ry = up ? 2.7 : Math.abs(car.hy) * 2.3 + Math.abs(car.hx) * 1.0;
        Object.assign(car.item, { x0: car.x - rx, x1: car.x + rx, y0: car.y - ry, y1: car.y + ry, z0: car.z, z1: car.z + 1.4 + (car.roll ? 1.2 : 0) });
        out.push(car.item);
      }
      puffs.items(out);
    },
    shadows(ctx: Ctx) {
      for (const car of cars) {
        if (car.z < 0.05) rectShadow(ctx, car.x, car.y, car.hx, car.hy, 2.2, 0.95, 1.1);
        else blobShadow(ctx, car.x, car.y, Math.max(0.9, 2.2 - car.z * 0.25), 1);
      }
    },
  };

  return { act };
}

/**
 * The pad and its driveway as part of the town's road outline: asphalt like a car park, kerbed as one with the roads,
 * the driveway's corners rounded where it leaves the avenue (x 76) and where it opens into the pad (x 83).
 */
export function padRoad(ctx: Ctx) {
  const d = PAD_DRIVE, r = 2.4;
  groundRect(ctx, PAD.x0, PAD.y0, PAD.x1, PAD.y1);
  groundRect(ctx, d.x0, d.y0, d.x1, d.y1);
  // each fillet: the corner, then the arc that rounds it off, centred a radius away along both kerbs
  for (const [cx, cy, ox, oy] of [[76, d.y0, r, -r], [76, d.y1, r, r], [PAD.x0, d.y0, -r, -r], [PAD.x0, d.y1, -r, r]]) {
    // from where the arc meets the driveway's kerb round to where it meets the other kerb
    const from = Math.atan2(-oy, 0), to = Math.atan2(0, -ox);
    let da = to - from;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    groundPoly(ctx, [cx, cy, ...arcPts(cx + ox, cy + oy, r, from, da, 8)]);
  }
}

/** The landing circles and the spot where the car sets down, painted on the pad after the roads. */
export function padMarks(ctx: Ctx, pal: Palette) {
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
}
