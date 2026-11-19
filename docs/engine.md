# The engine (`src/engine/`)

## Space and drawing

- World units are metres: x runs to the screen's lower right, y to the lower left, z up. Screen ("design") space is
  `X = (x − y)·cos 30°`, `Y = (x + y)/2 − z` (`core.ts`); the camera scales design units to pixels.
- Everything that stands up has a world bounding box. `sort.ts` orders overlapping boxes back to front by the axis
  that separates them. Keep boxes tight; a box that overlaps another in all three axes sorts unpredictably.
- `Mat` (in `core.ts`) is a matte material shaded from one key light. Colours come from the palettes in
  `palette.ts` (light and night); add a palette entry rather than writing a colour into a drawing function.
- Static scenery is baked once per size into device-pixel-aligned bitmaps (`BoxItem`, `FnItem.still()` in
  `statics.ts`); only `.live()` overlays (LEDs, glints) draw every frame. The ground, roads and static shadows are
  one cached layer (`Scene.renderGround`, `World.ground`).
- Night lighting: window bloom (`details.ts` `windowGlow`), light spilling onto the ground in front of lit facades
  (`windowSpill`, faces listed in `world.ts` `litFaces` and `outskirts.ts`), and headlights / tail lights
  (`lights.ts`). The road pass runs after the moving shadows and before anything standing, so a vehicle's own body
  covers its beams.
- Tall `BoxItem`s become shadow casters automatically (`world.ts` end, `shade.ts`): objects in their shadow are
  tinted.

## Where things are

- `world.ts` the campus core: roads, buildings, the docks and yard, the compute platform, parks, walkways, routes.
- `outskirts.ts` what lies beyond the classic frame, for wide views: the factory wing, staff car park, second compute
  platform, Megapack field, charging hub, staff park.
- `blocks.ts` builders used in both: `rackPlatform` (server racks with the glowing edge) and `megapacks`.
- `activities.ts` the scripted scenes (truck yard, loading bay, charging lot, robotaxi stop, crane, dog walk);
  `stalls.ts` car parks whose cars come and go (`StallLot`).
- `vehicles.ts` meshes, paths, zones and the traffic model; `walkers.ts` people, robots and the walkway graph.
- `scene.ts` camera fit, frame loop, baking. `FRAME` is the classic 121.2 × 65 view; `WIDE` lets a box wider than
  that show up to 210 m across in `cover` mode. `contain` shows the whole height, so anything placed within about
  ±105 m (screen X) of the centre is seen in a 3.2 : 1 banner.

## Adding something to the world

- Check it against everything that moves through that spot: trucks' trailers sweep far wider than their lanes (see
  `docs/simulation.md`), and people walk walkway edges with an offset of up to 0.75 m.
- Look at it at the classic shape, at 1630 × 520 with `cover`, and at 2000 × 631 with `contain`, in both themes.
