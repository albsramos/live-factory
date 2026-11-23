// The yard's chargers, one beside each spot a semi parks (the two docks and the charging bay). While a semi is parked
// there, the cable runs to the cab's charge port and glows (see charging.ts).

import { boxShadow } from '../ground';
import type { Palette } from '../palette';
import { FnItem } from '../statics';
import { HD, HW, H, drawChargeCable, drawChargerPost } from '../charging';

/**
 * The charger beside one parking spot (a dock or the bay), on its own kerbed island just outside the semis' sweep.
 * A semi parked there has its charge port at `port`, just beyond the post's right side so the whole cable shows;
 * while it is there (`spot.loading`) the cable is plugged in and glows. One item for the post and its cable, kept
 * clear of the cab's box (which ends before `port`'s y), so it always sorts in front of the truck. With `isPostOnly`
 * its box is just the post's, for a spot whose leaving trucks swing their trailers out past the port (the carrier
 * depot's): the cable only shows while a truck stands there, and it still sorts in front of it.
 */
export function charger(pal: Palette, px: number, py: number, port: [number, number, number], spot: { loading: boolean }, isPostOnly = false) {
  const y0 = isPostOnly ? py - HD - 0.05 : Math.min(port[1], py - HD - 0.05);
  return new FnItem(
    Math.min(port[0], px - HW) - 0.1, y0, 0, Math.max(port[0], px + HW) + 0.1, Math.max(port[1], py + HD + 0.05), H,
    (r) => {
      // the cable first, so it runs out from behind the post
      if (spot.loading) drawChargeCable(r, pal, [px + HW, py, 1.2], port);
      drawChargerPost(r, pal, px, py, spot.loading ? 'charging' : 'idle');
    },
    (ctx) => boxShadow(ctx, px - HW, py - HD, px + HW, py + HD, H),
  );
}
