# The engine (`src/engine/`)

## Space and drawing

- World units are metres: x runs to the screen's lower right, y to the lower left, z up. Screen ("design") space is
  `X = (x − y)·cos 30°`, `Y = (x + y)/2 − z` (`core.ts`); the camera scales design units to pixels.
- Everything that stands up has a world bounding box. `sort.ts` orders overlapping boxes back to front by the axis
  that separates them. Keep boxes tight; a box that overlaps another in all three axes sorts unpredictably.
- `Mat` (in `core.ts`) is a matte material shaded from one key light. Colours come from the palettes in
  `palette.ts` (light and night); add a palette entry rather than writing a colour into a drawing function.
- A theme change keeps the scene as it stands: `morphPalette` turns the palette into the other theme's in place
  (materials, colour lists and values), and the scene re-bakes its bitmaps. So read colours from the palette or a
  `Mat` when drawing, never copy one out at build time (a `Mat`'s `.right`, `pal.tyre`, a colour worked out from
  `pal.night`): it would keep the old theme. Where a colour must be worked out once (people's clothes, a vehicle's
  lamp slots) redo it when `pal.generation` moves on (`Walker.recolor`, `recolor` in `traffic/vehicleItem.ts`). Box edges take
  `CLAY_EDGE`, which `edgeColor` resolves by theme.
- Vehicles: the SUV (every car on the road and in the car parks), the pickup, the robotaxi pod and van, the roadster
  and the semi. Colours: `pal.paints` holds only the SUV's (white, silver, graphite, black); the pickup is always
  silver (`traffic/paints.ts`, applied by `traffic.add`); the robotaxis are gold (`pal.gold`).
- Static scenery is baked once per size into device-pixel-aligned bitmaps (`BoxItem`, `FnItem.still()` in
  `statics.ts`); only `.live()` overlays (LEDs, status lights) draw every frame. The ground, roads and static shadows
  are one cached layer (`Scene.renderGround`, `world/groundPlan.ts`).
- Night lighting: window bloom (`details.ts` `windowGlow`), light spilling onto the ground in front of lit facades
  (`windowSpill`, faces listed in `world/groundPlan.ts` `litFaces` and `world/outskirts.ts`), and headlights / tail
  lights (`lights.ts`: a full-width light bar glows along its whole length, and a low beam is one soft fan of light,
  drawn once as an image and laid on the road along each vehicle's heading, clipped out of the shadows that the
  vehicles standing in it cast away from the lamp, `beamShadows.ts`). The road pass runs after the moving shadows
  and before anything standing, so a vehicle's own body covers its beams.
- Tall `BoxItem`s become shadow casters automatically (`world/world.ts` end, `shade.ts`): objects in their shadow
  are tinted.

## Where things are

Every file stays under 300 lines; split by responsibility when one grows past that.

- `world/` the layout. `world.ts` builds it all in a fixed order (everything draws from one seeded random stream, so
  moving a call changes the scene): `roads.ts` zones and through traffic, `buildings.ts` the factory (with
  `lettering.ts`, its opt-in lettering), dock wing, pavilion, home and construction site, `streetLife.ts` trees,
  lamps, benches, the pocket park and people standing about, `walkways.ts` the walkway graph, `groundPlan.ts` the
  cached ground layer, `chargers.ts` the yard's chargers (posts and glowing cable in `../charging.ts`),
  `entrance.ts` the factory's main entrance (a V-shaped recess drawn as part of the face it is cut into, clipped to
  the opening so it needs no sort item, and the pillars in its mouth), `outskirts.ts` what lies beyond the classic
  frame for wide views (factory wing, staff car park, second compute platform, Megapack field, charging hub, staff
  park).
- `blocks.ts` builders used in both: `rackPlatform` (server racks with the glowing edge) and `megapacks`;
  `details.ts` windows, glass, solar roofs.
- `activities/` the scripted scenes, one per file (truck yard, loading bay, charging lot, robotaxi stop, crane, dog
  walk, loopers, the roadster) on the shared `activity.ts`; `stallLot.ts` car parks whose cars come and go.
- `traffic/` vehicles and the traffic model: `zone.ts` reservations, `legs.ts` a trip's legs and their zones,
  `vehicle.ts` driving, `sense.ts` what a vehicle brakes for, `meshes.ts` and `vehicleItem.ts` how vehicles look
  (`bodyKit.ts` smooth bodies built from slices, used by `suvMesh.ts`, `podMesh.ts` (the robotaxi) and
  `tractorMesh.ts`, the semi's cab; `wheels.ts` the round wheels every vehicle stands on; `doors.ts` the robotaxis'
  doors), `hop.ts` the roadster's flight (a vehicle's `z` and `roll`), `exhaust.ts` its jets and the smoke puffs
  (each puff its own small sort item), `traffic.ts` all of it together.
- `people/` `walker.ts` a person or robot following steps, `figure.ts` how they are drawn, `crowd.ts` the walkway
  graph and the crowd that wanders it.
- `draw.ts` boxes and faces (`onWall` for an upright face at any angle), `mesh.ts` convex meshes (a mesh's `under`,
  such as the SUV's wheels, is drawn just before it, and of its `sides`, such as the robotaxi's flush wheels, the
  one facing the camera after it and the other before; drawn at a height, and optionally rolled about their length
  axis, which reorders their parts so a body upside down still stacks right), `ground.ts` shadows and ground shapes,
  `lights.ts` night road lighting.
- `scene.ts` frame loop and baking; `frame.ts` options and framing. `FRAME` is the classic 121.2 × 65 view; `WIDE`
  lets a box wider than that show up to 210 m across in `cover` mode. `contain` shows the whole height, so anything
  placed within about ±105 m (screen X) of the centre is seen in a 3.2 : 1 banner.

## Adding something to the world

- Check it against everything that moves through that spot: trucks' trailers sweep far wider than their lanes (see
  `docs/simulation.md`), and people walk walkway edges with an offset of up to 0.75 m.
- Look at it at the classic shape, at 1630 × 520 with `cover`, and at 2000 × 631 with `contain`, in both themes.
