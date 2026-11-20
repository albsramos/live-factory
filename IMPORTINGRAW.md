# Importing live-factory raw: the component's source in your own codebase

For an app that doesn't want `live-factory` as a dependency (no `npm install`, no Git dependency, no build step on
install) and instead keeps the component's source in its own repository, to own, review and change like its own
code.

`src/` is written to be copied as it is: plain TypeScript and React, one CSS module, and no other imports, no build
tool features and no generated files. This was checked by copying it into a fresh Vite + React app with strict
TypeScript (`target: ES2022`, `useDefineForClassFields`): it typechecked, built and drew the scene with no changes.

## What you need

- **React 17 or newer.** The only package `src/` imports.
- **A bundler that compiles TypeScript and CSS modules**: Vite, Next.js, Remix, Astro, Create React App, webpack with
  a TypeScript loader. Anything that understands `import styles from './X.module.css'`.
- **Module resolution that allows imports without file extensions** (`"moduleResolution": "bundler"` or `"node"`).
  `NodeNext`, which requires `.js` on every relative import, won't resolve them.
- **`lib` with `DOM` and `ES2022`** in the `tsconfig.json` the copy is compiled with, and a target of ES2020 or later.
  The source passes `strict` and `noUnusedLocals`.

## Copy it

Copy everything in `src/` except the tests, into a folder of its own. For example, from your app's root:

```sh
git clone --depth 1 https://github.com/albsramos/live-factory /tmp/live-factory
mkdir -p src/vendor/live-factory
cp -R /tmp/live-factory/src/. src/vendor/live-factory/
find src/vendor/live-factory -name '*.test.*' -delete
git -C /tmp/live-factory rev-parse HEAD   # the commit you copied: note it (see "Updating")
```

That is about 70 files:

| Path | What it is |
|---|---|
| `index.ts` | The public entry: `LivingCity`, its props type, the `Scene` engine, `resolveTheme` / `watchTheme`. Import from here only. |
| `LivingCity/` | The React component, its CSS module, and the controller that starts, sizes, themes, pauses and stops the scene (`cityController.ts`, `afterLoad.ts`, `idleWatch.ts`). |
| `engine/` | The scene engine: plain TypeScript drawing on a 2D canvas, no React. `docs/engine.md` in this repository explains it. |
| `theme.ts` | Works out whether the page around the scene is light or dark. |

The tests (`*.test.ts(x)`) need Vitest and jsdom and import CSS with Vite's `?raw`. Leave them out, or keep them if
your app already runs Vitest.

## Use it

```tsx
import { LivingCity } from '@/vendor/live-factory'; // or a relative path to the folder

export function Hero() {
  return <LivingCity style={{ height: 520 }} />;
}
```

Every prop and the sizing rules are in this repository's `README.md` (*Props*, *Sizing*, *Dark mode*).

## Two things the npm package does that a copy must do itself

1. **Next.js App Router (React Server Components):** add `'use client';` as the first line of
   `LivingCity/LivingCity.tsx`. The published package adds it to its bundle; the source doesn't have it.
2. **Styles:** the package puts its CSS into its JavaScript. A copy uses `LivingCity/LivingCity.module.css`, which
   your bundler handles like any other CSS module. Without it the box has no shape (`aspect-ratio`) and no ground
   colour before the first frame. If your setup has no CSS modules, rename it to `LivingCity.css`, import it as a
   plain stylesheet, and change the two class names in `LivingCity.tsx` (`styles.root`, `styles.canvas`) to fixed
   strings such as `lf-root` and `lf-canvas`, renamed in the CSS too.

## Fit it into your codebase

- **Lint and format:** leave the folder out of your lint and format rules (`.eslintignore`, `.prettierignore`, or
  your tool's ignore list), so updates stay a clean copy and a diff shows only real changes.
- **Server rendering:** safe. Nothing touches `window` or `document` until the component mounts.
- **Without React:** use `Scene` from `index.ts` on any `<canvas>` (*Without React* in the README), and you can then
  delete `LivingCity/`.
- **Changing it:** fine, it's your copy. Keep changes few and note them (a short `CHANGES.md` in the folder), so an
  update can carry them over.
- **What it costs visitors:** `docs/performance.md` in this repository.

## Updating

There's no `npm update`: you copy again.

1. Note the commit you copied from (step *Copy it*), for example in a `README.md` inside the folder.
2. To update, see what changed upstream since then:
   `git -C /tmp/live-factory diff <old commit> HEAD -- src/` (after a fresh clone or a `git pull`).
3. Copy again as above, put back your own changes, and check the version in upstream's `package.json` and the notes
   under *Props* in its README, which say when a prop was renamed or a default changed.

## Licence

MIT, as declared in this repository's `package.json`. The MIT licence asks that copies keep its copyright and
permission notice: put it with the copied files, for example in the folder's `README.md`.

## For coding agents working in the host app

- Copy `src/` without its tests into one folder. Import only from that folder's `index.ts`.
- Add `'use client';` to `LivingCity/LivingCity.tsx` if the app uses React Server Components.
- Make sure the bundler handles `*.module.css`. Otherwise convert it as described above.
- Don't reformat or lint-fix the copied files. Record the upstream commit you copied from.
- Typecheck and build the app, then check in a browser that the scene draws and fades in.
