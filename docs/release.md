# Images, builds and publishing

- `npm run record:gifs` re-records `docs/demo-light.gif`, `docs/demo-dark.gif` (the README's animated previews) and
  `docs/preview-light.jpg` (the social preview the website uses). Do it whenever the opening 15 seconds look
  different. Needs Playwright with Chromium and ffmpeg.
- `npm run build` the library into `dist/` (also run on install from GitHub, by `prepare`).
- `npm run build:site` the website into `site-dist/`. Every push to `main` deploys it to GitHub Pages
  (`.github/workflows/pages.yml`); the address is https://albsramos.github.io/live-factory/.
- `npm run build:artifact` the website as one file, `artifact-dist/live-factory.html`.
- The package isn't on npm; people install it with `npm install github:albsramos/live-factory`. Bump `version` in
  `package.json` when a change breaks callers (a renamed prop, a changed default).
