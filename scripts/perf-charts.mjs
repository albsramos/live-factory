// Draws the charts in docs/performance.md from docs/performance/results.json (written by scripts/measure-perf.mjs).
// Plain SVG, no dependencies; each chart follows the reader's light or dark setting.
//
// Usage: node scripts/perf-charts.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const R = JSON.parse(readFileSync('docs/performance/results.json', 'utf8'));
const DIR = 'docs/performance';
const W = 720;
const STYLE = `<style>
  svg { --surface:#fcfcfb; --ink:#0b0b0b; --ink2:#52514e; --muted:#898781; --grid:#e1e0d9; --axis:#c3c2b7; --s1:#2a78d6; --s2:#eb6834; }
  @media (prefers-color-scheme: dark) { svg { --surface:#1a1a19; --ink:#f0efec; --ink2:#c3c2b7; --muted:#898781; --grid:#2c2c2a; --axis:#383835; --s1:#3987e5; --s2:#d95926; } }
  text { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; fill: var(--ink2); font-size: 12px; }
  .title { fill: var(--ink); font-size: 15px; font-weight: 600; }
  .sub { fill: var(--ink2); font-size: 12px; }
  .tick { fill: var(--muted); font-size: 11px; }
  .val { fill: var(--ink); font-size: 12px; font-weight: 600; }
  .grid { stroke: var(--grid); stroke-width: 1; }
  .axis { stroke: var(--axis); stroke-width: 1; }
</style>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const svg = (name, h, title, sub, body, alt) => {
  writeFileSync(`${DIR}/${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${esc(alt)}">
${STYLE}
<rect width="${W}" height="${h}" rx="12" fill="var(--surface)"/>
<text class="title" x="24" y="34">${esc(title)}</text>
<text class="sub" x="24" y="54">${esc(sub)}</text>
${body}
</svg>
`);
  console.log(`wrote ${DIR}/${name}.svg`);
};
/** A column with a 4px rounded top and a square foot, from y0 (baseline) up to y1. */
const column = (x, w, y0, y1, fill, roundTop) => {
  const h = y0 - y1;
  if (h <= 0) return '';
  const r = roundTop ? Math.min(4, h, w / 2) : 0;
  return `<path fill="${fill}" d="M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 + r} V${y0} Z"/>`;
};
const legend = (x, y, items) => items.map(([label, color], i) =>
  `<rect x="${x + i * 340}" y="${y - 9}" width="10" height="10" rx="2" fill="${color}"/><text x="${x + i * 340 + 16}" y="${y}">${esc(label)}</text>`).join('');
const yAxis = (x0, x1, top, base, max, ticks, fmt) => ticks.map((t) => {
  const y = base - ((base - top) * t) / max;
  return `<line class="${t ? 'grid' : 'axis'}" x1="${x0}" x2="${x1}" y1="${y}" y2="${y}"/><text class="tick" x="${x0 - 8}" y="${y + 4}" text-anchor="end">${fmt(t)}</text>`;
}).join('');

/** Stacked columns (script, then the rest of the main-thread time) in one or more panels. */
function stackedPanels(name, title, sub, panels, alt) {
  const named = panels.length > 1, h = named ? 364 : 340, top = named ? 128 : 104, base = h - 50, max = 100, left = 64;
  const pw = (W - left - 24) / panels.length;
  let body = legend(24, 80, [['Page script (what a machine with a GPU pays)', 'var(--s1)'], ['Drawing pixels in software (no GPU)', 'var(--s2)']]);
  body += yAxis(left, W - 24, top, base, max, [0, 25, 50, 75, 100], (t) => `${t}%`);
  panels.forEach((p, pi) => {
    const x0 = left + pi * pw, band = (pw - 16) / p.bars.length, bw = Math.min(24, band * 0.5);
    if (named) body += `<text class="val" x="${x0 + pw / 2}" y="104" text-anchor="middle">${esc(p.name)}</text>`;
    p.bars.forEach((b, i) => {
      const cx = x0 + 8 + band * (i + 0.5), x = cx - bw / 2;
      const yS = base - ((base - top) * Math.min(b.script, max)) / max;
      const yT = base - ((base - top) * Math.min(b.total, max)) / max;
      body += column(x, bw, base, yS, 'var(--s1)', yT >= yS - 2);
      if (yS - yT > 2) body += column(x, bw, yS - 2, yT, 'var(--s2)', true);
      body += `<text class="val" x="${cx}" y="${yT - 6}" text-anchor="middle">${Math.round(b.total)}%</text>`;
      body += `<text class="tick" x="${cx}" y="${base + 18}" text-anchor="middle">${esc(b.label)}</text>`;
    });
  });
  body += `<text class="tick" x="${left}" y="${h - 14}">Share of one CPU core the page's main thread is busy</text>`;
  svg(name, h, title, sub, body, alt);
}

/** One line over x values, with an optional dashed-free reference line and end labels. */
function lineChart({ name, title, sub, xs, ys, xLabel, yMax, yTicks, yFmt, ref, alt, h = 300, color = 'var(--s1)' }) {
  const top = 84, base = h - 56, left = 64, right = W - 40;
  const xMin = xs[0], xMax = xs.at(-1);
  const X = (v) => left + ((right - left) * (v - xMin)) / (xMax - xMin || 1);
  const Y = (v) => base - ((base - top) * v) / yMax;
  let body = yAxis(left, right, top, base, yMax, yTicks, yFmt);
  if (ref) body += `<line x1="${left}" x2="${right}" y1="${Y(ref.v)}" y2="${Y(ref.v)}" stroke="var(--ink2)" stroke-width="1"/><text class="tick" x="${right}" y="${Y(ref.v) - 6}" text-anchor="end">${esc(ref.label)}</text>`;
  body += `<polyline fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${xs.map((x, i) => `${X(x)},${Y(ys[i])}`).join(' ')}"/>`;
  xs.forEach((x, i) => {
    if (xs.length <= 8) body += `<circle cx="${X(x)}" cy="${Y(ys[i])}" r="4.5" fill="${color}" stroke="var(--surface)" stroke-width="2"/><text class="val" x="${X(x)}" y="${Y(ys[i]) - 10}" text-anchor="middle">${yFmt(ys[i])}</text>`;
  });
  if (xs.length > 8) body += `<circle cx="${X(xMax)}" cy="${Y(ys.at(-1))}" r="4.5" fill="${color}" stroke="var(--surface)" stroke-width="2"/><text class="val" x="${X(xMax) + 8}" y="${Y(ys.at(-1)) + 4}">${yFmt(ys.at(-1))}</text>`;
  const step = xs.length > 8 ? 5 : 1;
  xs.forEach((x, i) => { if (i % step === 0 || i === xs.length - 1) body += `<text class="tick" x="${X(x)}" y="${base + 18}" text-anchor="middle">${esc(xLabel(x))}</text>`; });
  svg(name, h, title, sub, body, alt);
}

// 1. the frame cap
const capLabel = (c) => (c ? `${c} fps` : 'every refresh');
stackedPanels('fps-cap', 'Fewer frames, less work', 'Main-thread time at 1600×860 by frame cap, in each theme (lower is better). 30 fps is the default.',
  ['light', 'dark'].map((theme) => ({ name: theme === 'light' ? 'Light theme' : 'Dark theme', bars: R.fpsCap.filter((r) => r.theme === theme).map((r) => ({ label: capLabel(r.maxFps), script: r.scriptPct, total: r.mainThreadPct })) })),
  'Stacked columns of main-thread time by frame cap for the light and dark themes.');

// 2. screen size
stackedPanels('screen-size', 'Bigger screens cost more pixels', 'Main-thread time at 30 fps by canvas size, light theme.',
  [{ name: '', bars: R.sizes.map((r) => ({ label: r.size, script: r.scriptPct, total: r.mainThreadPct })) }],
  'Stacked columns of main-thread time by screen size.');

// 3. a slower CPU
lineChart({
  name: 'slow-cpu', title: 'On a slower CPU the frame rate drops, nothing breaks', sub: 'Frames drawn per second at 1366×768 as the CPU is slowed down (Chromium CPU throttling, software drawing).',
  xs: R.throttle.map((r) => r.slowdown), ys: R.throttle.map((r) => r.fps), xLabel: (x) => (x === 1 ? 'this machine' : `${x}× slower`),
  yMax: 40, yTicks: [0, 10, 20, 30, 40], yFmt: (v) => `${Math.round(v)}`, ref: { v: 30, label: 'cap: 30 fps' },
  alt: 'Line chart of frames drawn per second against CPU slowdown.',
});

// 4. loading the website
{
  const s = R.site, h = 220, left = 24, right = W - 24, top = 96, end = Math.max(1200, Math.ceil((Math.max(s.loadMs, s.firstPaintMs, ...s.longTasks.map((t) => t.start + t.ms)) + 100) / 200) * 200);
  const X = (ms) => left + ((right - left) * ms) / end;
  let body = '';
  for (let t = 0; t <= end; t += 200) body += `<line class="grid" x1="${X(t)}" x2="${X(t)}" y1="${top}" y2="${top + 60}"/><text class="tick" x="${X(t)}" y="${top + 78}" text-anchor="middle">${t} ms</text>`;
  for (const t of s.longTasks) body += `<rect x="${X(t.start)}" y="${top + 14}" width="${Math.max(2, X(t.start + t.ms) - X(t.start) - 2)}" height="32" rx="4" fill="var(--s2)"/><text class="val" x="${X(t.start + t.ms / 2)}" y="${top + 8}" text-anchor="middle">${t.ms} ms</text>`;
  body += `<line x1="${X(s.firstPaintMs)}" x2="${X(s.firstPaintMs)}" y1="${top + 4}" y2="${top + 56}" stroke="var(--ink)" stroke-width="2"/><text class="tick" x="${X(s.firstPaintMs) + 6}" y="${top + 56}">first paint</text>`;
  body += `<text class="tick" x="${left}" y="${h - 14}">Long tasks (over 50 ms) on the main thread while the page loads. Total blocking time: ${s.blockingMs} ms.</text>`;
  svg('startup', h, 'Loading: the page is busy for a moment, once', 'The built website at 1366×768: building the world and baking its bitmaps blocks the main thread.', body, `Timeline of long tasks while loading; total blocking time ${s.blockingMs} ms.`);
}

// 5. out of view
{
  const s = R.site, rows = [['On screen', s.steady.browserCpuPct], ['Scrolled out of view', s.offscreen.browserCpuPct], ['Empty tab, for comparison', s.emptyTab.browserCpuPct]];
  const h = 200, left = 210, right = W - 80, top = 84, max = Math.max(100, ...rows.map((r) => r[1]));
  let body = '';
  rows.forEach(([label, v], i) => {
    const y = top + i * 34, w = Math.max(2, ((right - left) * v) / max);
    body += `<text x="${left - 12}" y="${y + 15}" text-anchor="end">${esc(label)}</text><path fill="var(--s1)" d="M${left},${y + 2} H${left + w - Math.min(4, w / 2)} Q${left + w},${y + 2} ${left + w},${y + 6} V${y + 18} Q${left + w},${y + 22} ${left + w - Math.min(4, w / 2)},${y + 22} H${left} Z"/><text class="val" x="${left + w + 8}" y="${y + 16}">${v.toFixed(1)}%</text>`;
  });
  body += `<text class="tick" x="24" y="${h - 14}">CPU time of the whole browser (every process), share of one core, built website at 1366×768.</text>`;
  svg('offscreen', h, 'Out of view, it costs nothing', 'The scene stops its frame loop as soon as it leaves the screen.', body, 'Bar chart: browser CPU on screen, scrolled out of view, and for an empty tab.');
}

// 6. a month
if (R.month?.length) {
  const m = R.month, days = m.map((d) => d.day);
  const nice = (v) => { const p = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / p) * p; };
  const panel = (key, title, sub, fmt, name) => {
    const ys = m.map((d) => d[key] ?? NaN);
    const xs = days.filter((_, i) => !Number.isNaN(ys[i])), vs = ys.filter((v) => !Number.isNaN(v));
    const max = nice(Math.max(...vs) * 1.25);
    lineChart({ name, title, sub, xs, ys: vs, xLabel: (d) => `day ${d}`, yMax: max, yTicks: [0, max / 4, max / 2, (3 * max) / 4, max], yFmt: fmt, h: 260, alt: `${title}: line over 30 scene days.` });
  };
  panel('heapMB', 'Memory stays flat for a month', 'JavaScript heap after garbage collection, sampled once per scene day.', (v) => `${v.toFixed(1)} MB`, 'month-memory');
  panel('moving', 'Nothing piles up', 'Things moving in the scene (vehicles, people, robots, smoke puffs), sampled once per scene day.', (v) => `${Math.round(v)}`, 'month-moving');
  panel('stepUs', 'A simulation step costs the same on day 30 as on day 1', 'Average cost of one 1/30 s simulation step over each scene day.', (v) => `${v.toFixed(1)} µs`, 'month-step');
  panel('frameMs', 'Drawing a frame costs the same too', 'Average time to draw one frame (1600×860, software drawing), sampled once per scene day.', (v) => `${v.toFixed(1)} ms`, 'month-frame');
}
