# The demo website (`site/`)

A Vite + React app; `npm run dev` serves it, `npm run build:site` builds `site-dist/`, the Pages workflow deploys it.
`npm run build:artifact` packs the same page into one file for a Claude artifact.

## Structure

- `src/app/App/` the page: composes the features (only here do features meet).
- `src/features/playground/` the live scene and its controls. Settings live in the URL (`model/settings.ts`), read
  with `useSyncExternalStore` (`shared/lib/searchParams.ts`), so a configured view can be shared.
- `src/features/usage/` how to install and use the component.
- `src/shared/ui/` domain-free primitives (Button, Segmented, Slider, CodeBlock, Code, Panel); `src/shared/lib/` hooks
  and helpers. Tokens are in `src/styles/tokens.css` (light and dark).

## Rules (the react-component skill, albsramos/skills)

- A folder per component, `Name.tsx` + `Name.module.css`; subcomponents one level deep, private to the folder.
- Main file at most 250 lines, subcomponents 120. Over the limit means split by responsibility.
- No effects: derive during render, act in handlers, `key` to reset, callback refs, `useSyncExternalStore`.
- Boolean props start with `is` / `are`. Variants are string unions.
- CSS modules only, colours and sizes from the tokens, flat selectors, no `!important`, no outer margin on a
  component's root, states through attributes (`data-state`, `aria-pressed`), container queries for component
  layout.
- `npm run check:components` checks the folders, line counts, effects, boolean names and `!important`.

The library's `<LivingCity>` is the exception to CSS modules: its two elements are styled inline so the package
works without the host importing a stylesheet.
