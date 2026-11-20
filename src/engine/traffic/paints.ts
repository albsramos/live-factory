// Which colours each kind of vehicle comes in. Callers pick from the palette's paints as they always have (so the
// random stream, and the rest of the scene, stays as it is); a kind with a narrower range swaps what it was given.

import type { Mat } from '../core';
import type { Palette } from '../palette';
import type { VehicleKind } from './meshes';

/** The palette's paints by index: 0, 1 white, 2 silver, 3 grey, 4 graphite, 5 black, 6 champagne. */
const SILVER = 2;
/** The SUV comes in white, silver, graphite or black: grey becomes silver and champagne becomes white. */
const SUV_SWAP: Partial<Record<number, number>> = { 3: SILVER, 6: 0 };

/** The paint a vehicle of `kind` wears when given `paint`: the pickup is always silver; the SUV keeps to its range. */
export function paintFor(pal: Palette, kind: VehicleKind, paint: Mat): Mat {
  const i = pal.paints.indexOf(paint);
  // anything not from the paint list (the robotaxis' gold, a semi's white) is the caller's own choice
  if (i < 0) return paint;
  if (kind === 'pickup') return pal.paints[SILVER];
  if (kind === 'suv') return pal.paints[SUV_SWAP[i] ?? i];
  return paint;
}
