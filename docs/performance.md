# Performance

The scene runs on someone else's page, often for hours, so it has to stay cheap. What keeps it cheap, and how not
to break it:

## What is in place

- The scene stops off screen (`IntersectionObserver` → `Scene.setVisible`) and in hidden tabs (rAF stops there).
- When paused or with reduced motion it draws one frame and stops the loop (`Scene.sync`).
- It draws 30 fps by default (`maxFps`). The 4 ms slack in `Scene.loop` keeps 30 from dropping to 20 on a 60 Hz screen.
- Device pixels are capped at 2× (`maxDpr`). The canvas is opaque (`alpha: false`).
- Static scenery is baked once into pixel-aligned bitmaps and stamped (`bake.ts`). Only `.live()` overlays redraw.
- The ground, roads and static shadows, blur included, are one cached layer (`Scene.renderGround`).
- Sprites, the headlight beam image and gradients are made once and cached (`sprites.ts`, `lights.ts`, `details.ts`).
- Each `Mat` keeps 33 shades worked out in advance, so drawing never builds colour strings.
- The depth sort culls to the view, compares only boxes that overlap on screen, and reuses its arrays (`sort.ts`).
- The moving shadows are drawn as one path and one `fill`.
- A resize, theme or branding change only re-bakes. Only `seed` or `density` rebuild the world.
- Simulation steps are at most 1/30 s, and a long gap counts as 0.1 s at most. It warms up 40 s before the first frame.
- If the canvas is lost (`contextrestored`), its caches are emptied and baked again.

## When you change things

- Something that never moves is a `BoxItem` or a `FnItem.still()`. Don't draw it every frame.
- An animated detail on a static item goes in `.live()`, not in `draw()`; that would stop the item being baked.
- Ground-level paint (markings, pools of light, lawns) goes in the ground layer (`world/groundPlan.ts`), not a sort item.
- Don't allocate in the frame path: no new arrays, closures, gradients or colour strings per frame or per item.
  Cache them on the palette (and redo them when `pal.generation` changes), or build them once.
- A cache that depends on colours is emptied on a theme change. One that depends on scale is emptied in `layout()`.
  Hook a new cache into the same place (`Scene.set`, `Scene.layout`, `onRestored`).
- Keep `getContext('2d', { alpha: false })`, the `maxFps`/`maxDpr` defaults, and the visibility and pause stops.
  Callers rely on them.
- Keep tight world boxes on new items. Loose boxes mean more overlapping pairs to sort, and wrong order too.
