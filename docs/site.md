# The demo website (`site/`)

A Vite + React app; `npm run dev` serves it, `npm run build:site` builds `site-dist/`, the Pages workflow deploys it.
`npm run build:artifact` packs the same page into one file for a Claude artifact.

## Structure

- `src/app/App/` the page: composes the features (only here do features meet).
- The page is just the name and the playground: no other text (how to install and use the component is in the
  README).
- `src/features/playground/` the live scene and its controls. Settings live in the URL (`model/settings.ts`), read
  with `useSyncExternalStore` (`shared/lib/searchParams.ts`), so a configured view can be shared. The button in the
  scene's corner shows it on the whole screen, `full=1` in the URL, so a link can open straight into it: the stage
  is `position: fixed` over the window, and on the click the browser is also asked for its full screen (a page may
  only ask on a click; an iPhone keeps it for video). On the whole screen a sun / moon button sits beside it
  (`StageButton`), since the theme tabs are out of reach there. No ancestor of the stage may set `container-type` or
  other containment, which would trap it. The site shows the factory's lettering (`isBranded`), which the component
  leaves off by default.
- `src/shared/ui/` domain-free primitives (Button, Segmented, Slider) in the plain neutral look of shadcn/ui: a
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
