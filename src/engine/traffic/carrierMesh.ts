// The car carrier: a semi whose trailer is an open two-deck frame, new SUVs riding on it. It is an ordinary semi
// (same tractor, same 9.6 m trailer geometry and bodies, so traffic treats it like any other) tagged with the role
// `carrier`; `drawTrailer` hands it to `drawCarrier` here. What it carries lives in `LOADS`, which the north yard
// (activities/carrierYard.ts) fills as cars drive up its ramp.
// Everything is in the kingpin's frame, l back along the trailer (negative), w across it, as in meshes.ts.

import { type Mat, pick, type Rng } from '../core';
import type { R } from '../draw';
import { MeshBuilder, drawMesh, type MatSlot } from '../mesh';
import { MESH } from './meshes';
import { wheelsMesh } from './wheels';
import type { Vehicle } from './vehicle';

const box = (l0: number, l1: number, w: number): number[][] => [[l1, -w], [l1, w], [l0, w], [l0, -w]];
const W = 1.27;

/** A deck slot: where a car's centre rides (l) and how high its wheels stand (z). Upper deck first, front first. */
export interface Slot {
  l: number;
  z: number;
  upper: boolean;
}
export const SLOTS: readonly Slot[] = [
  { l: -2.3, z: 2.5, upper: true },
  { l: -7.1, z: 2.5, upper: true },
  { l: -11.85, z: 2.95, upper: true },
  { l: -4.8, z: 0.72, upper: false },
  { l: -10.4, z: 1.15, upper: false },
];
/** where a car stands on the ground, centred behind the trailer, before it drives up the ramp */
export const RAMP_FOOT = -16.9;

/** A car on the carrier: its slot, its paint, and how far along it has driven (l) while it is still loading. */
export interface DeckCar {
  slot: Slot;
  paint: Mat;
  l: number;
}
export const LOADS = new WeakMap<Vehicle, DeckCar[]>();

/** How high a car's wheels stand at `l` on its way up the ramp to `slot`. */
export function deckZ(slot: Slot, l: number) {
  const ramp = (l0: number, l1: number, z0: number, z1: number) => z0 + (z1 - z0) * Math.min(1, Math.max(0, (l - l0) / (l1 - l0)));
  if (l < -12.4) return ramp(RAMP_FOOT + 1.2, -12.4, 0, slot.upper ? 2.95 : 1.15);
  if (slot.upper) return ramp(-9.6, -8.9, 2.95, 2.5);
  return ramp(-8.1, -7.3, 1.15, 0.72);
}

// the frame: landing legs and the gooseneck over the fifth wheel, the wheels under the rear
const base = (() => {
  const m = new MeshBuilder();
  m.frustum(box(-1.7, -1.3, 0.95), 0.1, box(-1.7, -1.3, 0.95), 1.0, 2, 2);
  m.frustum(box(-1.5, 0.6, 1.05), 1.0, box(-1.5, 0.6, 1.05), 1.45, 2, 2);
  const frame = (u: MeshBuilder) => u.frustum(box(-12.7, -7.9, 0.5), 0.75, box(-12.7, -7.9, 0.5), 1.1, 2, 2);
  return { ...m.build(), under: wheelsMesh(frame, [-8.95, -10.25], 0.5, 0.5, 1.2) };
})();

// the decks: thin steel plates, the lower one dipping in front of the axles, the upper one stepping up at the rear
// dark steel, like the frame (material slot 1, the vehicles' dark glass, and 2, their tyres)
const plate = (m: MeshBuilder, l0: number, l1: number, z: number) => m.frustum(box(l0, l1, W - 0.12), z - 0.1, box(l0, l1, W - 0.12), z, 2, 1);
const lower = (() => {
  const m = new MeshBuilder();
  plate(m, -7.7, -1.5, 0.72);
  plate(m, -12.8, -7.7, 1.15);
  return m.build();
})();
const upper = (() => {
  const m = new MeshBuilder();
  plate(m, -9.3, 0.4, 2.5);
  plate(m, -14.2, -9.3, 2.95);
  return m.build();
})();

/** The rails and posts down one flank (s = 1 for +w, -1 for -w). */
function flank(s: number) {
  const m = new MeshBuilder();
  const rail = (l0: number, l1: number, z0: number, z1: number) => {
    const p = box(l0, l1, 0.06).map(([l, w]) => [l, w + s * (W - 0.06)]);
    m.frustum(p, z0, p, z1, 2, 2);
  };
  rail(-12.8, -1.5, 0.55, 0.78);
  rail(-9.3, 0.4, 2.32, 2.5);
  rail(-14.2, -9.3, 2.77, 2.95);
  for (const [l, top] of [[0.3, 2.5], [-4.6, 2.5], [-9.3, 2.95], [-12.7, 2.95]]) rail(l - 0.08, l + 0.08, 0.6, top);
  return m.build();
}
const sides = [flank(1), flank(-1)];

const carMats = (r: R, v: Vehicle, paint: Mat): MatSlot[] => {
  const pal = v.pal;
  // parked on the trailer: lights off
  return [paint, pal.carGlass, pal.tyre, r.night ? pal.carGlass : pal.headlight, pal.carGlass, paint, pal.robot, pal.robotHead];
};

/** The trailer of a car carrier, its cars on it; (kx, ky) is the kingpin, (hx, hy) the trailer's heading. */
export function drawCarrier(r: R, v: Vehicle, kx: number, ky: number, hx: number, hy: number) {
  const cars = LOADS.get(v) ?? [];
  const near = hx - hy > 0 ? 0 : 1;
  const at = (c: DeckCar) => {
    const z = deckZ(c.slot, c.l);
    return { x: kx + hx * c.l, y: ky + hy * c.l, z };
  };
  const drawCars = (isUpper: boolean) => {
    const list = cars.filter((c) => c.slot.upper === isUpper).map((c) => ({ c, p: at(c) }));
    // far ones first
    list.sort((a, b) => a.p.x + a.p.y - (b.p.x + b.p.y));
    for (const { c, p } of list) drawMesh(r, MESH.suv, p.x, p.y, p.z, hx, hy, carMats(r, v, c.paint));
  };
  drawMesh(r, base, kx, ky, 0, hx, hy, v.mats);
  drawMesh(r, sides[1 - near], kx, ky, 0, hx, hy, v.mats);
  drawMesh(r, lower, kx, ky, 0, hx, hy, v.mats);
  drawCars(false);
  drawMesh(r, upper, kx, ky, 0, hx, hy, v.mats);
  drawCars(true);
  drawMesh(r, sides[near], kx, ky, 0, hx, hy, v.mats);
}

/** How far past the trailer's box (l −12.8) a carrier reaches back: the overhang, or a car on its way up the ramp. */
export function carrierReach(v: Vehicle) {
  let back = 1.4;
  for (const c of LOADS.get(v) ?? []) back = Math.max(back, -12.8 - (c.l - 2.43));
  return back;
}

/**
 * A paint for a car on a carrier: mostly white, otherwise white or silver, never graphite or black. The first three
 * of the SUV's paints (`pal.paints`) are the light ones.
 */
export function carrierPaint(rng: Rng, paints: readonly Mat[]): Mat {
  return rng() < 0.55 ? paints[0] : pick(rng, paints.slice(0, 3));
}
