// Re-records the README's animated previews (docs/demo-light.gif, docs/demo-dark.gif) and the social preview
// image (docs/preview-light.jpg, also used by the website) from the live scene: 15 simulated seconds from the opening
// frame, 1600 × 860, scaled to 960 px at 12.5 fps with a 128-colour palette.
//
// Usage: node scripts/record-gifs.mjs
// Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium) and ffmpeg.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const FRAMES = 150, STEP = 0.1;
const server = await createServer({ mode: 'lab', logLevel: 'warn', server: { port: 5391, strictPort: false } });
await server.listen();
const url = server.resolvedUrls.local[0];
// required rather than imported, so a Playwright installed globally is found too
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const work = mkdtempSync(join(tmpdir(), 'live-factory-gif-'));

try {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1700, height: 1000 }, deviceScaleFactor: 1 });
    await page.goto(`${url}?debug&speed=0.0001`);
    await page.waitForFunction(() => window.scene);
    await page.evaluate((theme) => {
      const s = window.scene;
      s.setVisible(false);
      s.set({ theme });
      // the theme change normally dissolves over half a second of real time; frames here are stepped by hand
      s.fadeT = 0;
      s.resize(1600, 860);
    }, theme);
    const canvas = page.locator('canvas');
    for (let i = 0; i < FRAMES; i++) {
      await page.evaluate((dt) => {
        window.scene.step(dt);
        window.scene.render();
      }, STEP);
      await canvas.screenshot({ path: join(work, `${theme}-${String(i).padStart(4, '0')}.png`) });
    }
    await page.close();
    const palette = 'scale=960:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle';
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '12.5', '-i', join(work, `${theme}-%04d.png`), '-vf', palette, '-loop', '0', `docs/demo-${theme}.gif`]);
    if (theme === 'light') {
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(work, 'light-0080.png'), '-vf', 'scale=1280:-2:flags=lanczos', '-q:v', '3', 'docs/preview-light.jpg']);
    }
    console.log(`docs/demo-${theme}.gif`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
  await browser.close();
  await server.close();
}
