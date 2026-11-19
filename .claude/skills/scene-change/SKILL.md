---
name: scene-change
description: Change something visible or moving in the live-factory scene (a building, a route, a car park, a park, colours, lights, framing) and get it ready to ship. Covers checking it in every shape and theme, the simulation check, re-recording the README previews and the commit. Use for any change under src/engine/.
---

# Changing the scene

1. Read `docs/engine.md`; if anything moves (vehicles, people, zones, walkways), read `docs/simulation.md` too.
2. Make the change, then look at it with `npm run dev`: the Card shape and the Banner shape, in Light and in Night.
   For anything near the edges, also check a 1630 × 520 box with `fit="cover"` (the lab's `?debug` page exposes
   `window.scene`: `scene.set({ fit: 'cover' })`, `scene.resize(1630, 520)`).
3. `npm run typecheck` and `npm run build`.
4. If anything moves: `npm run check:sim` (pass `60` for changes near the junction, the truck yard or the loading
   bay). Keep going until it prints OK: no vehicle touching a person, no collision, traffic flowing as usual.
5. If the first 15 seconds of the scene look different: `npm run record:gifs`.
6. If what the scene shows or the component's API changed, update `README.md` (the features list, the props table).
7. Commit: authored by Alberto, a `Co-Authored-By:` trailer for the agent, and a body that says what changed and
   why for each area touched.
