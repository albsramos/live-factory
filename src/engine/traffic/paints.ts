// Which colours each kind of vehicle comes in. The palette's paints are the Model Y's colours (white, silver,
// graphite, black) and callers pick from them; a kind with a narrower range swaps what it was given, so the random
// stream, and the rest of the scene, stays as it is.

import type { Mat } from '../core';
import type { Palette } from '../palette';
import type { VehicleKind } from './meshes';

/** The palette's paints by index: 0, 1 white, 2 silver, 3 graphite, 4 black. */
const SILVER = 2;

/** The paint a vehicle of `kind` wears when given `paint`: the pickup is always silver, the rest as given. */
export function paintFor(pal: Palette, kind: VehicleKind, paint: Mat): Mat {
  // anything not from the paint list (the robotaxis' gold, a semi's white) is the caller's own choice
  if (kind === 'pickup' && pal.paints.includes(paint)) return pal.paints[SILVER];
  return paint;
}
