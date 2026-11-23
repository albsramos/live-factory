# Traffic, people and the checks

## Vehicles

- Vehicles start and end their trips beyond the edges of every framing: outside the world box (`WORLD` in
  `frame.ts`: screen X from −150 to 150 m, Y from −5 to 100 m, where X = (x − y) · cos 30°, Y = (x + y) / 2 − z), by
  about 25 m, so nobody pops into view, however far a page zooms out (it stops at that box). The avenue runs from
  y = −120 to y = 175, the street east to x = 230 and south to y = 200, the staff car park's service road to y = 230.
  A spawn check (`traffic.clear`) tests the spawn point itself, so move it with the route. People walk in and out at
  portals just as far out, or at a building door; the robotaxi's passengers get in and out at the bay.
- A vehicle follows a list of legs; each leg is a filleted polyline (`Path.poly(points, radii)`, where `radii[i]` is
  the fillet at `points[i + 1]`). A leg can wait (`until`), dwell, reverse (`rev`) or ignore the vehicle ahead
  (`ghost`, only inside lots that a mutex keeps to one car).
- Vehicles brake for whatever body lies on their own path ahead (`senseAhead`, margin = own half width + 0.15 m).
  Two vehicles whose bodies come that close across lanes will each see the other and stop: keep a lane's swept
  area at least that far from opposing traffic.
- Zones (`traffic.zone`) are reserved before entering. A leg's zones that lie within a gap of each other (3.5 m, or
  a truck length for semis) are reserved together, all or nothing, and the vehicle queues in each zone it asks.
  Two consequences that have caused gridlocks:
  - never let a zone sit closer than 3.5 m to the junction on a car's path, or cars reserve the junction from far
    away and their queue entries block other movements;
  - a semi waiting for one zone holds a queue place in every zone of that group, so don't group a busy zone with the
    junction on a semi's leg. Split the leg instead.
- There are two junctions with the street, the avenue's (J, x 68–76) and the east road's (J2, x 142–150), each with
  its own signal phases. Through traffic on the east road comes from a spawner of its own (`spawner` in `roads.ts`),
  which keeps its own count.
- Don't block the junction: a car (not a semi) only reserves a group holding the junction when the road past it
  has room for its whole length, free of anything standing, braking or queueing there (`roomPast` in `legs.ts`,
  `roomOn` in `sense.ts`). Until its nose is in, it gives the junction back if that room fills up and it can still
  stop. Without this, westbound cars queueing back from the park corner stopped inside the junction while the bay
  semi, its trailer still holding the corner's zones, waited for that junction: a gridlock that the deadlock
  breaker (`stuckT` in `vehicle.ts`) ended by letting cars drive through each other.
- Don't enter a junction behind a semi: `roomPast` also refuses while any part of a semi lies on the car's path
  within 25 m past the junction's exit (`semiOn` in `sense.ts`), moving or not. Without it, westbound cars queued
  back from the bend where the bay truck's trailer swings across their turn south, one of them stopped inside the
  junction, and the bay truck, waiting at that junction behind a car turning across it, waited on it in turn: a loop
  of waits through a zone, which the deadlock breaker doesn't see (it follows vehicles, not zones). Two other fixes
  were tried and dropped: a semi-only zone over the bend (grouped with the merge, plaza and crosswalk zones beside
  it, it locked the whole corner) and holding the bay truck until the stretch was quiet (it cost truck runs, and a
  charging-lot car pulling out ahead of it still set the loop off).
- Don't let a semi stand in a junction waiting for a zone past it: the yard's semis leaving south take the junction
  only together with the zebra 30 m beyond it (`groupGap` on their last leg, which widens the gap within which a
  leg's zones are reserved together). Without it, a semi stood in the junction waiting for that zebra while a
  northbound car stood on the zebra waiting for the junction, until the deadlock breaker let cars drive through each
  other (check:sim, a few runs in sixteen once the town's timing shifted).
- A vehicle keeps a zone until no part of its footprint (the box round its turned outline, plus 0.3 m) is in it, so
  a long trailer holds a crossing until it has fully passed, and lets go as soon as it has.
- Where two movements of one car park share a driveway, tag their legs (`tag: 'in'` / `'out'`, as `StallLot` does)
  and give the driveway's zone `keyOf = (_v, leg) => leg.tag ?? 'car'`, so a car turning in and one turning out
  take turns instead of swinging into each other.
- Only reservations taken when a leg starts count. If a vehicle's nose is already over a zone when its leg begins,
  it can't stop before it: end the previous leg earlier.
- Semis: the trailer cuts inside every turn, by metres. Before adding zones, crossings or props near a semi's route,
  find its swept area: run the simulation and record the semi's bodies (`v.bodies`) along the route, or replay the
  trailer (it trails the kingpin 9.6 m behind, see `updateTrailer`) along the path points.

- The truck yard: two docks and a charging bay (`activities/truckYard.ts`). A semi loads at a dock, then backs into
  the bay to charge, then leaves. One semi moves in the yard at a time (a mutex, which a leaving semi keeps until its
  cab is a few metres down the avenue and its trailer has followed it out); a second may come in and load while
  one charges, because neither one's sweep touches the other parked, and it waits at its dock until the bay is free.
  Each parking spot's charger, and the battery bank, stand on kerbed islands outside every sweep. After changing the yard, record
  the semis' bodies over 30 minutes and check that nothing fixed lies in them (the island, the platform, the batteries).

- The north yard (`activities/carrierYard.ts`): car carriers come down a service road at x 34 from the north,
  stop in one of two lanes (y −38.5 and −29.5) and leave north up a second road at x 62.5; neither touches the
  avenue. New cars are scripted, not traffic: they start behind the factory (hidden by it in every view), drive up
  the west side (x 32.5) and onto a ramp. One thing moves in the yard at a time (a mutex for carriers coming and
  going and the cars), and the south lane's carrier leaves only when the north lane is empty, since its trailer cuts
  the corner across the north lane's cab. The trailers cut deep into the corners north of the lanes, out to y −46 at
  x 38 and x 57 at the north belt's path: the paving, the zebra zones (`NB`, `NB2` in `world/roads.ts`) and their
  walkway nodes cover that, and the north belt keeps its trees and lamps out of it. Seven more full carriers stand
  parked side by side, facing north, y −26 to −7: two on the west side (x 37.2 and 41.6), between the cars' way up
  and the Megapacks and south of the entry turn's sweep, and a row of five north of the factory (x 11.6 to 28.4),
  west of the cars' way up and 3 m short of their way out from behind the factory. They are scenery, not traffic
  (`CarrierYard.park`); nothing that moves comes within 0.8 m of them.

- The carrier depot (`activities/carrierDepot.ts`), east of the avenue north of the second compute hall: four full
  carriers parked nose-in facing the avenue (noses at x 81, y −36 to −22.8), scenery rather than traffic, and a
  charging lane along the depot's north edge (y −41.8). About every two minutes a carrier comes down the avenue's
  southbound lane from off the top edge, drives 20 m past the lane and backs straight into it (the back-in replays a
  forward pull-out from the lane, left onto the southbound lane, with `backingTrack`; it stops 0.1 m short and charges on a leg of its own, since a reversing vehicle's
  zones are only let go on a later leg, its trailer leading), charges, then turns right onto
  the northbound lane and off north. Nothing reaches the depot from behind (north of it is the north belt's lawn),
  and one carrier is in the depot at a time. Before it backs up, it holds the southbound lane from y −44.8 to −20.3
  (taken by the leg down the avenue) and, taken together in that leg's `until`, the stretch of the northbound lane by the
  depot (y −45.3 to −34.3, a zone of its own, short so that a gap in the traffic comes soon) and the east pavement
  (`DC`) its trailer swings across: backing in sweeps the northbound lane from y −43.7 to −35.2 and
  the pavement from −43.7 to −36.2, and stays 4 m clear of the parked row's noses and 0.7 m of the lane's charger.
  Turning out, the trailer sweeps the pavement from y −64.6 to −39.9 and reaches x 81.1 at the north belt's path,
  which starts east of that (x 86). Walkers cross the whole stretch as one (`DC`, nodes at y −67.4 and −34.4). The
  lanes' stretches are `truckZone`s keyed `semi` only for legs tagged `depot`, so cars leave them to the carrier and
  any other semi passes as a car.

- The roadster (`activities/roadster.ts`, `traffic/hop.ts`): one every 30-45 s and one at a time, on the avenue's
  straight lanes, with a random stream of its own so the rest of the scene runs as before until it shows up. In its
  take-off stretch it lifts off once it is moving with room ahead, or standing in a queue (it hops over it). From
  take-off to touchdown
  it is `aloft`: it lets go of every zone it holds or queues for, marks those it has flown right over as done and
  reserves none, brakes for nothing, and nothing brakes for it above `ALOFT_Z` (`sense.ts`, the robotaxi stop). It
  cruises at 6.2 m, over a semi's trailer. It only comes down in its landing stretch, and only when nothing would be
  in its way down at any point of its descent (each vehicle carried on along its own route, both at its speed and
  pulling away, since one waiting below may set off as it flies over; a semi counts from higher up) and every zone it
  comes down in, or reaches within its stopping room, would let it in (`Zone.wouldGrant`, which doesn't queue). It
  takes those zones as it starts down, like a car arriving, so a hub car waits rather than merging under it.
  Otherwise it flies on off the edge. Northbound, it sets down before the charging hub's driveway (y 16): a car
  turning in there or pulling out isn't in the landing check's forecast, and once came down on one. The checks ignore a vehicle that is above another or above people.

## People

- People walk the walkway graph (`WalkGraph` in `people/crowd.ts`). An edge linked with a zone is a crossing: a person
  takes the zone for the whole edge and waits at the node before it. Nodes either side of a crossing must sit outside
  every vehicle's swept area, offset included (`spread` scales the offset where space is tight).
- Wanderers never start part-way along a crossing. Newcomers walk in at a portal node (`g.node(x, y, true)`):
  a walkway end off screen (same rule as the vehicles' spawn points) or a building door. Activities that need a
  person mid-scene take one with `crowd.arrival(kind)`, never one placed in view.
- Nobody walks through a building or a platform: a figure inside another item's box breaks the depth sort and the
  item flickers. The one exception is the factory's door: its node stands in the entrance recess (`ENTRANCE_DOOR`
  in `world/entrance.ts`), inside the factory's box, where the sort's fallback always draws a figure after the
  factory. Keep it within about 1.5 m of the face, or a figure's head shows over the floor above. Scripted loops
  (`Looper`) run in a straight line from their last step back to their first, so close the loop explicitly when that
  line would cut through something.
- The parks are for staff on their break: people only (no robots), sitting or chatting; no kids, no ball games.
- About half the wanderers are humanoid robots (`crowd.targetRobots`), and half the street chat groups' members.

## Checking a change

`npm run check:sim` (default 20 simulated minutes; pass a number for more). It must report 0 vehicles touching
people, 0 collisions and 0 pop-ins (anything appearing or vanishing inside the world box), traffic standing still
around 15–20 % (counted inside the world box), and truck runs at their usual rate. It also prints how many vehicles
and people the classic banner shows on average (about 17 and 68): the routes run far past every view, so when they
change, retune `targetCars` (`world/roads.ts`) and the crowd's targets (`world/world.ts`) to keep that. Run 60 minutes
for anything near the junction, the yard or the loading bay.
