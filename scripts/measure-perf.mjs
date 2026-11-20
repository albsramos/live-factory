// Measures what the scene costs a visitor's machine and writes docs/performance/results.json, which
// scripts/perf-charts.mjs turns into the charts in docs/performance.md.
//
// Usage: npm run build && npm run build:site && node scripts/measure-perf.mjs [--quick] [--month]
//   --quick  shorter runs (5 s instead of 20 s per measurement), for trying the script out
//   --month  also fast-forward 30 days of scene time (about 40 minutes), sampled once a scene day
// Needs Playwright with Chromium. Process CPU is read from /proc, so that column is Linux only.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { createServer as createHttp } from 'node:http';
import { gzipSync } from 'node:zlib';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import { cpus } from 'node:os';
import { createServer } from 'vite';

const args = new Set(process.argv.slice(2));
const SECS = args.has('--quick') ? 5 : 20;
const OUT = 'docs/performance/results.json';
const { chromium } = createRequire(import.meta.url)('playwright');
const results = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const save = () => {
  mkdirSync('docs/performance', { recursive: true });
  writeFileSync(OUT, JSON.stringify(results, null, 2) + '\n');
};
const log = (...a) => console.log(...a);

// ---- CPU time of a browser and everything it started, from /proc (Linux) ----
function procTree(root) {
  const kids = {};
  for (const p of readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
    try {
      const st = readFileSync(`/proc/${p}/stat`, 'utf8');
      const ppid = st.slice(st.lastIndexOf(')') + 2).split(' ')[1];
      (kids[ppid] ??= []).push(p);
    } catch {}
  }
  const out = [String(root)];
  for (let i = 0; i < out.length; i++) out.push(...(kids[out[i]] ?? []));
  return out;
}
function cpuSeconds(root) {
  if (!existsSync('/proc/self/stat')) return NaN;
  let t = 0;
  for (const p of procTree(root)) {
    try {
      const st = readFileSync(`/proc/${p}/stat`, 'utf8');
      const f = st.slice(st.lastIndexOf(')') + 2).split(' ');
      t += (+f[11] + +f[12]) / 100;
    } catch {}
  }
  return t;
}

// ---- servers: the dev lab (?debug exposes window.scene) and the built website ----
const lab = await createServer({ mode: 'lab', logLevel: 'warn', server: { port: 5392, strictPort: false } });
await lab.listen();
const labUrl = lab.resolvedUrls.local[0];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const site = createHttp((req, res) => {
  const path = join('site-dist', decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!path.startsWith('site-dist') || !existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
}).listen(0);
const siteUrl = `http://localhost:${site.address().port}/`;

/** Open a page in a browser of its own, so its CPU time can be told apart from everything else. */
async function withPage(opts, fn) {
  const server = await chromium.launchServer({ args: ['--enable-precise-memory-info'] });
  const browser = await chromium.connect(server.wsEndpoint());
  try {
    const page = await browser.newPage({ viewport: opts.viewport ?? { width: 1600, height: 860 }, deviceScaleFactor: opts.dpr ?? 1, colorScheme: opts.theme ?? 'light' });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    return await fn({ page, cdp, pid: server.process().pid });
  } finally {
    await browser.close();
    await server.close();
  }
}

/** Main-thread busy time, script time, process CPU and frames drawn, over SECS seconds. */
async function sample({ page, cdp, pid }, countFrames) {
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  if (countFrames) await page.evaluate(() => {
    const s = window.scene, render = s.render.bind(s);
    window.__frames = [];
    s.render = () => { const t = performance.now(); render(); window.__frames.push(performance.now() - t); };
  });
  const a = await metrics(), c0 = cpuSeconds(pid);
  await page.waitForTimeout(SECS * 1000);
  const z = await metrics(), c1 = cpuSeconds(pid);
  const wall = z.Timestamp - a.Timestamp;
  const out = {
    mainThreadPct: +((100 * (z.TaskDuration - a.TaskDuration)) / wall).toFixed(1),
    scriptPct: +((100 * (z.ScriptDuration - a.ScriptDuration)) / wall).toFixed(1),
    browserCpuPct: +((100 * (c1 - c0)) / wall).toFixed(1),
    heapMB: +(z.JSHeapUsedSize / 1e6).toFixed(1),
  };
  if (countFrames) {
    const f = (await page.evaluate(() => window.__frames)).sort((x, y) => x - y);
    Object.assign(out, { fps: +(f.length / wall).toFixed(1), frameP50: +f[f.length >> 1].toFixed(2), frameP95: +f[Math.floor(f.length * 0.95)].toFixed(2) });
  }
  return out;
}

async function openScene(ctx, { theme = 'light', maxFps = 30, w = 1600, h = 860, throttle = 1 }) {
  await ctx.page.goto(`${labUrl}?debug`);
  await ctx.page.waitForFunction(() => window.scene);
  await ctx.page.evaluate(({ theme, maxFps, w, h }) => {
    const s = window.scene, c = document.querySelector('canvas');
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    s.resize(w, h);
    s.set({ theme, maxFps });
  }, { theme, maxFps, w, h });
  await ctx.page.waitForTimeout(2000);
  if (throttle > 1) await ctx.cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
}

results.machine = { cpu: cpus()[0]?.model, cores: cpus().length, browser: 'headless Chromium (software rendering, no GPU)', date: new Date().toISOString().slice(0, 10), secondsPerRun: SECS };

// 1. the frame cap, in both themes
results.fpsCap = [];
for (const theme of ['light', 'dark']) for (const maxFps of [0, 30, 20, 15]) {
  const r = await withPage({}, async (ctx) => (await openScene(ctx, { theme, maxFps }), sample(ctx, true)));
  results.fpsCap.push({ theme, maxFps, ...r });
  log('fps cap', theme, maxFps, r);
}
save();

// 2. screen size (the canvas fills it)
results.sizes = [];
for (const [w, h] of [[1366, 768], [1600, 860], [1920, 1080], [2560, 1440]]) {
  const r = await withPage({ viewport: { width: w, height: h } }, async (ctx) => (await openScene(ctx, { w, h }), sample(ctx, true)));
  results.sizes.push({ size: `${w}×${h}`, ...r });
  log('size', w, h, r);
}
save();

// 3. a slow CPU: Chromium's throttling slows the page's thread by this factor
results.throttle = [];
for (const rate of [1, 2, 4, 6]) {
  const r = await withPage({ viewport: { width: 1366, height: 768 } }, async (ctx) => (await openScene(ctx, { w: 1366, h: 768, throttle: rate }), sample(ctx, true)));
  results.throttle.push({ slowdown: rate, ...r });
  log('throttle', rate, r);
}
save();

// 4. the built website: loading, steady state, and scrolled out of view
results.site = await withPage({ viewport: { width: 1366, height: 768 } }, async (ctx) => {
  const { page } = ctx;
  await page.addInitScript(() => {
    window.__long = [];
    new PerformanceObserver((l) => window.__long.push(...l.getEntries().map((e) => ({ start: e.startTime, ms: e.duration })))).observe({ type: 'longtask', buffered: true });
  });
  await page.goto(siteUrl, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const load = await page.evaluate(() => ({
    long: window.__long,
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
    load: performance.getEntriesByType('navigation')[0]?.loadEventEnd ?? null,
  }));
  const steady = await sample(ctx, false);
  // push the scene out of view: its IntersectionObserver should stop the frame loop
  await page.evaluate(() => {
    document.body.style.paddingBottom = '4000px';
    scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(1500);
  const hidden = await sample(ctx, false);
  const blank = await (async () => (await page.goto('about:blank'), sample(ctx, false)))();
  return {
    firstPaintMs: Math.round(load.fcp), loadMs: Math.round(load.load),
    longTasks: load.long.map((t) => ({ start: Math.round(t.start), ms: Math.round(t.ms) })),
    blockingMs: Math.round(load.long.reduce((s, t) => s + Math.max(0, t.ms - 50), 0)),
    steady, offscreen: hidden, emptyTab: blank,
  };
});
log('site', results.site);
save();

// 5. download size
const gz = (f) => gzipSync(readFileSync(f)).length;
const siteJs = readdirSync('site-dist/assets').filter((f) => f.endsWith('.js')).map((f) => join('site-dist/assets', f));
results.size = {
  libraryKB: existsSync('dist/index.js') ? +(statSync('dist/index.js').size / 1024).toFixed(1) : null,
  libraryGzipKB: existsSync('dist/index.js') ? +(gz('dist/index.js') / 1024).toFixed(1) : null,
  siteJsGzipKB: +(siteJs.reduce((s, f) => s + gz(f), 0) / 1024).toFixed(1),
};
log('size', results.size);
save();

// 6. a month of scene time, fast-forwarded: memory, how many things move, and the cost of a step and a frame
if (args.has('--month')) {
  results.month = await withPage({}, async ({ page }) => {
    await page.goto(`${labUrl}?debug`);
    await page.waitForFunction(() => window.scene);
    await page.evaluate(() => window.scene.set({ paused: true }));
    const out = [];
    const probe = () => page.evaluate(() => {
      const s = window.scene, items = [];
      s.world.items(items);
      const t = performance.now();
      for (let i = 0; i < 30; i++) s.render();
      return { day: Math.round(s.t / 86400), heapMB: +(performance.memory.usedJSHeapSize / 1e6).toFixed(1), moving: items.length, frameMs: +((performance.now() - t) / 30).toFixed(2) };
    });
    out.push({ ...(await probe()), stepUs: null });
    for (let day = 1; day <= 30; day++) {
      let busy = 0;
      for (let hour = 0; hour < 24; hour++) busy += await page.evaluate(() => {
        const s = window.scene, t = performance.now();
        for (let i = 0; i < 3600 * 30; i++) s.step(1 / 30);
        return performance.now() - t;
      });
      out.push({ ...(await probe()), stepUs: +((busy / (24 * 3600 * 30)) * 1000).toFixed(1) });
      log('month', out.at(-1));
    }
    return out;
  });
  save();
}

await lab.close();
site.close();
log(`wrote ${OUT}`);
