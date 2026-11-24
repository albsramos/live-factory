# live-factory

A self-running isometric factory town for React: one `<canvas>`, no text, no dependencies besides React.

## Stack

- TypeScript (strict) and React (peer, 17 or newer). Vite 8 builds the library (ESM + CJS, marked `'use client'`,
  the component's CSS module injected by the bundle), the demo website and the dev lab; `tsc` emits the type
  declarations. Vitest (jsdom) runs the unit tests.
- The scene engine is plain TypeScript drawing on a 2D canvas, with no runtime dependencies.

## Layout

- `src/` the package: `LivingCity/` (the React component: `LivingCity.tsx`, `LivingCity.module.css`,
  `LivingCity.test.tsx` and its controller), `engine/` (see `docs/engine.md`), `theme.ts`
- `site/` the demo website GitHub Pages serves; it imports the package as `live-factory`
- `demo/` the dev lab (`npm run dev:lab`): `?gallery` shows every vehicle, `?debug` exposes `window.scene`
- `scripts/` builds and checks; `docs/` README images and the guides below

## Always

- Before committing: `npm run typecheck`, `npm test` and `npm run check:components`; `npm run build` too if `src/`
  changed.
- Keep every source file under 300 lines (components: main 250, subcomponents 120); split by responsibility.
- A component's styles, tests and code share its folder: `Name/Name.tsx`, `Name/Name.module.css`,
  `Name/Name.test.tsx`.
- No `useEffect` / `useLayoutEffect` anywhere (`check:components` fails on them). Use a callback ref, an event
  handler or `useSyncExternalStore`.
- The scene shows no text, logos or brand marks. The one exception is the factory's lettering behind the opt-in
  `isBranded` prop (off by default; the demo site turns it on), all of it in `src/engine/world/lettering.ts`.
- Commits are authored by Alberto (the repo's git config) with a `Co-Authored-By:` trailer for the AI agent that
  worked on it. Subject line in the imperative, then a body that says what changed and why, area by area.
- Push to `main` only when asked; it redeploys the website.

## Read before you…

- edit anything in `src/engine/` → `docs/engine.md`
- add something drawn per frame, a cache, or touch the frame loop, baking or sizing → `docs/performance.md`
- change a route, zone, lot, walkway, or anything that moves → `docs/simulation.md`, then `npm run check:sim`
- add or edit a component in `site/` → `docs/site.md` (and the react-component skill)
- change `<LivingCity>`'s props → update the props table in `README.md`, and bump the version if it breaks callers
- change how the scene looks, or publish → `docs/release.md`, or the `scene-change` skill for the whole procedure
- change what `src/` imports or needs from its host (a new dependency, a new kind of import, a directive) →
  `docs/embed.md`, the steps for copying the source into another app without npm, and keep them true

To use this code in another app without npm, follow `docs/embed.md`.
