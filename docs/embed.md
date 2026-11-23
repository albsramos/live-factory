# Copying the source into another app (no npm)

For an app or a component library that wants the code itself rather than the package: copy the source in, and it
builds with the app. These steps were checked by copying `src/` into a bare Vite + React app with strict TypeScript:
it type-checks, bundles and draws, with no errors in the console.

## What it needs

- React 17 or newer (`react` and `react-dom`). Nothing else: the engine is plain TypeScript with no other imports.
- A bundler that handles TSX and CSS modules (`*.module.css`): Vite, Next.js, Create React App, Parcel and most
  React toolchains do this out of the box.
- TypeScript (optional, any `strict` setting works) with the `DOM` lib.

## Steps

1. **Copy `src/` into the app**, under a folder of your choosing, e.g. `src/live-factory/`. That is
   `index.ts`, `theme.ts`, `LivingCity/` and `engine/`.
2. **Leave out the tests**, unless the app runs Vitest with jsdom: `LivingCity/LivingCity.test.tsx` (it also uses
   Vite's `?raw` import), `engine/frame.test.ts` and `engine/traffic/paints.test.ts`.
3. **Let TypeScript import CSS modules**, if the app doesn't already (Vite apps get this from `vite/client`, Next.js
   from `next-env.d.ts`). Otherwise add a declaration file:

   ```ts
   // css-modules.d.ts
   declare module '*.module.css' {
     const classes: Record<string, string>;
     export default classes;
   }
   ```

4. **With React Server Components** (the Next.js App Router), put `'use client';` as the first line of the copied
   `LivingCity/LivingCity.tsx`. The npm build adds it for you; the source doesn't have it.
5. **Import from the folder's `index.ts`**, exactly as from the package:

   ```tsx
   import { LivingCity } from './live-factory';

   export function Hero() {
     return <LivingCity theme="auto" />;
   }
   ```

   The props are the README's props table; `Scene` (the bare engine) and the theme helpers are exported too.

## Without CSS modules

The component's styles are two classes in `LivingCity/LivingCity.module.css`: the box (`.root`: relative, full
width, the scene's aspect ratio 121.2 / 65, its theme's ground colour until the first frame) and the canvas filling
it (`.canvas`). If the app can't import CSS modules, move those rules into the app's own stylesheet under two class
names and set them in `LivingCity.tsx` in place of `styles.root` and `styles.canvas`.

## Keeping it up to date

Note the commit you copied (`git rev-parse HEAD` here) beside the copy. To update, copy `src/` again and repeat
steps 2 to 4; check the README's props table and its notes on breaking changes (the `version` in `package.json`
moves when a change breaks callers). The code is MIT licensed (`package.json`).
