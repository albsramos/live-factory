# The demo website (`site/`)

A Vite + React app; `npm run dev` serves it, `npm run build:site` builds `site-dist/`, the Pages workflow deploys it.
`npm run build:artifact` packs the same page into one file for a Claude artifact.

## Structure

- `src/app/App/` the page: composes the features (only here do features meet).
- The page is just the name, a "Possible look" link and the playground: no other text (how to install and use the
  component is in the README).
- `src/features/playground/` the live scene and its controls. Settings live in the URL (`model/settings.ts`), read
  with `useSyncExternalStore` (`shared/lib/searchParams.ts`), so a configured view can be shared. The button in the
  scene's corner shows it on the whole screen, `full=1` in the URL, so a link can open straight into it: the stage
  is `position: fixed` over the window, and on the click the browser is also asked for its full screen (a page may
  only ask on a click; an iPhone keeps it for video). On the whole screen a sun / moon button sits beside it
  (`StageButton`), since the theme tabs are out of reach there. No ancestor of the stage may set `container-type` or
  other containment, which would trap it. The site shows the factory's lettering (`isBranded`), which the component
  leaves off by default.
- `src/features/saver/` the bare scene for a screen saver, `?saver` in the URL (see the README): the scene alone on the
  whole window, no page, controls or cursor, branded, and moving even when the computer asks for reduced motion.
- `src/features/look/` a possible landing page built round the scene, `?look` in the URL, linked from the header's
  "Possible look" button: the scene as the header (branded), seen through a soft oval (a CSS mask: two linear fades
  and an ellipse that rounds their lower corners) that melts into the page at the sides and the bottom and only
  barely at the top, under the navigation, the same either side, centred and at most 1700 px wide, its clear middle the central third (each fade eases in over several stops, with no line where it starts), then stat cards that rise 64px into its lower edge. The header is half the window's height (`max(380px, 50vh)`, 500 px on a 16" MacBook at
  100%), its title on one line; the navigation bar sits on a band of its own in the page's colour (`--look-bg`), a hairline
  under it, and the scene starts below it; from 900px wide the scene's box runs past both edges (clipped), its middle a
  tenth of the width left of the window's, so the busiest part of the town (the avenue, the junction, the charging
  hub, the robotaxi stop) sits in the middle; the title block sits on a soft pool of the page's colour. The
  scene runs the header's height down to just under the cards' top, and from 900px wide it is
  `contain` (its whole height, outskirts filling the sides), so the bottom of the frame, the robotaxi stop and the
  crossing, stays in view; narrower, `cover`, which would otherwise leave empty ground above and below. Either way the
  camera sits a little further back than the fit (`zoom` 0.67) for more of the town; the world goes on past the frame,
  so no empty edges show. Then an output chart and an on-site list. The figures are samples (`model/sample.ts`) and
  the page says so; the title and place are left as `[Factory name]` and `[City, Country]`. Its palette is its own
  (`--look-*` in `Look.module.css`, night and day), switched by the theme in the URL (`auto` follows the computer).
  The content (the bar, the title and the cards) stops at 900 px wide (`--look-max`), with a gutter either side that
  grows with the screen (`--look-gutter`, 24–96 px); the scene's oval spans the whole width. That pool is drawn on the title block, so it
  stays behind the title at any width.
- `src/shared/ui/` domain-free primitives (Button, LinkButton, Segmented, Slider) in the plain neutral look of shadcn/ui: a
  near-black primary (near-white at night), grey tabs and tracks, no accent colour. `src/shared/lib/` hooks and
  helpers. Tokens are in `src/styles/tokens.css` (light and dark).

## Rules (the react-component skill, albsramos/skills)

- A folder per component, `Name.tsx` + `Name.module.css`; subcomponents one level deep, private to the folder.
- Main file at most 250 lines, subcomponents 120. Over the limit means split by responsibility.
- No effects: derive during render, act in handlers, `key` to reset, callback refs, `useSyncExternalStore`.
- Boolean props start with `is` / `are`. Variants are string unions.
- CSS modules only, colours and sizes from the tokens, flat selectors, no `!important`, no outer margin on a
  component's root, states through attributes (`data-state`, `aria-pressed`), container queries for component
  layout.
- `npm run check:components` checks the folders, line counts, effects, boolean names and `!important`.

The library's `<LivingCity>` (`src/LivingCity/`) follows the same rules: `LivingCity.module.css` beside the
component and its test, `LivingCity.test.tsx`. Its defaults sit inside `:where()`, so any class the host passes
wins. The library build injects that CSS from the JS bundle (`injectCss` in `vite.config.ts`), so the package still
works without the host importing a stylesheet.
