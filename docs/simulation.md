# Traffic, people and the checks

## Vehicles

- Vehicles start and end their trips beyond the edges of every framing: at least 30 m past the last spot a wide
  banner shows, so nobody pops into view. The banner (3.1 : 1, `cover`) shows screen X within about ±104 m and screen
  Y from 15 to 81 m (X = (x − y) · cos 30°, Y = (x + y) / 2 − z); the avenue's north end is y = −52.
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

## People

- People walk the walkway graph (`WalkGraph` in `people/crowd.ts`). An edge linked with a zone is a crossing: a person
  takes the zone for the whole edge and waits at the node before it. Nodes either side of a crossing must sit outside
  every vehicle's swept area, offset included (`spread` scales the offset where space is tight).
- Wanderers never start part-way along a crossing. Newcomers walk in at a portal node (`g.node(x, y, true)`):
  a walkway end off screen (same rule as the vehicles' spawn points) or a building door. Activities that need a
  person mid-scene take one with `crowd.arrival(kind)`, never one placed in view.
- Nobody walks through a building or a platform: a figure inside another item's box breaks the depth sort and the
  item flickers. The one exception is the factory's door: its node stands in the entrance recess (`ENTRANCE` in
  `world/buildings.ts`), inside the factory's box, where the sort's fallback always draws a figure after the
  factory. Keep it within about 1.5 m of the face, or a figure's head shows over the floor above. Scripted loops (`Looper`) run in a straight line from their last step back to their first, so close
  the loop explicitly when that line would cut through something.
- The parks are for staff on their break: people only (no robots), sitting or chatting; no kids, no ball games.
- About half the wanderers are humanoid robots (`crowd.targetRobots`), and half the street chat groups' members.

## Checking a change

`npm run check:sim` (default 20 simulated minutes; pass a number for more). It must report 0 vehicles touching
people and 0 collisions, traffic standing still around 20 %, and truck runs at their usual rate. Run 60 minutes
for anything near the junction, the yard or the loading bay.
