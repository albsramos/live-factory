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

const OLD = (() => {
  try {
    return JSON.parse(readFileSync(`${DIR}/results-0.3.0.json`, 'utf8'));
  } catch {
    return null;
  }
})();

// 1. adaptive quality on the hard cases
{
  const label = (r) => (r.adaptive ? `adaptive: ${r.quality.fps} fps, ${r.quality.dpr}×` : 'fixed: 30 fps, 1.5×');
  stackedPanels('adaptive', 'Adaptive quality takes the pressure off', 'Main-thread time in the two hard cases, quality fixed and adaptive, on a 1.5× density screen (lower is better).',
    [...new Set(R.adaptive.map((r) => r.case))].map((name) => ({ name, bars: R.adaptive.filter((r) => r.case === name).map((r) => ({ label: label(r), script: r.scriptPct, total: r.mainThreadPct })) })),
    'Stacked columns of main-thread time, fixed against adaptive quality, for the dark theme without a GPU and for a 4× slower CPU.');
}

// 2. at rest
{
  const s = R.site, rows = [['On screen', s.steady.browserCpuPct], ['Nobody at the page for 5 min', s.idle.browserCpuPct], ['Scrolled out of view', s.offscreen.browserCpuPct], ['Empty tab, for comparison', s.emptyTab.browserCpuPct]];
  const h = 236, left = 230, right = W - 80, top = 84, max = Math.max(100, ...rows.map((r) => r[1]));
  let body = '';
  rows.forEach(([label, v], i) => {
    const y = top + i * 34, w = Math.max(2, ((right - left) * v) / max), r = Math.min(4, w / 2);
    body += `<text x="${left - 12}" y="${y + 15}" text-anchor="end">${esc(label)}</text><path fill="var(--s1)" d="M${left},${y + 2} H${left + w - r} Q${left + w},${y + 2} ${left + w},${y + 2 + r} V${y + 22 - r} Q${left + w},${y + 22} ${left + w - r},${y + 22} H${left} Z"/><text class="val" x="${left + w + 8}" y="${y + 16}">${v.toFixed(1)}%</text>`;
  });
  body += `<text class="tick" x="24" y="${h - 14}">CPU time of the whole browser (every process), share of one core: the demo website at 1366×768, no GPU.</text>`;
  svg('at-rest', h, 'When nobody is looking, it costs nothing', 'The scene stops when scrolled out of view, in a hidden tab, and after 5 minutes without input.', body, 'Bar chart of browser CPU on screen, idle, scrolled out of view and for an empty tab.');
}

// 3. loading, 0.3.0 against now
{
  const lanes = [...(OLD ? [['0.3.0', OLD.site]] : []), ['0.4.0', R.site]];
  const end = Math.max(1200, ...lanes.flatMap(([, s]) => s.longTasks.map((t) => Math.ceil((t.start + t.ms + 100) / 200) * 200)));
  const left = 84, right = W - 24, top = 84, lane = 64, h = top + lanes.length * lane + 64;
  const X = (ms) => left + ((right - left) * ms) / end;
  let body = '';
  for (let t = 0; t <= end; t += 200) body += `<line class="grid" x1="${X(t)}" x2="${X(t)}" y1="${top}" y2="${top + lanes.length * lane}"/><text class="tick" x="${X(t)}" y="${top + lanes.length * lane + 18}" text-anchor="middle">${t} ms</text>`;
  lanes.forEach(([name, s], i) => {
    const y = top + i * lane;
    body += `<text class="val" x="${left - 12}" y="${y + 38}" text-anchor="end">${name}</text>`;
    for (const t of s.longTasks) body += `<rect x="${X(t.start)}" y="${y + 22}" width="${Math.max(2, X(t.start + t.ms) - X(t.start) - 2)}" height="26" rx="4" fill="var(--s2)"/><text class="tick" x="${X(t.start + t.ms / 2)}" y="${y + 16}" text-anchor="middle">${t.ms}</text>`;
    body += `<line x1="${X(s.firstPaintMs)}" x2="${X(s.firstPaintMs)}" y1="${y + 14}" y2="${y + 56}" stroke="var(--ink)" stroke-width="2"/><text class="tick" x="${X(s.firstPaintMs) + 6}" y="${y + 58}">first paint ${s.firstPaintMs} ms</text>`;
  });
  body += `<text class="tick" x="24" y="${h - 14}">Long tasks (over 50 ms, length in ms) on the main thread while the demo website loads at 1366×768.</text>`;
  svg('startup', h, 'The page paints first, the scene follows', 'Since 0.4.0 the scene is built after the page has loaded, so the page’s own content is not held up.', body, 'Timeline of long tasks while the page loads, 0.3.0 against 0.4.0.');
}

// 4. a month
if (R.month?.length) {
  const m = R.month.filter((d) => d.heapMB != null), max = Math.max(20, Math.ceil((Math.max(...m.map((d) => d.heapMB)) * 1.3) / 10) * 10);
  lineChart({
    name: 'month', title: 'A month left running: memory stays flat', sub: 'JavaScript memory after garbage collection, once per day over 30 days of scene time.',
    xs: m.map((d) => d.day), ys: m.map((d) => d.heapMB), xLabel: (d) => `day ${d}`, yMax: max, yTicks: [0, max / 4, max / 2, (3 * max) / 4, max], yFmt: (v) => `${v.toFixed(1)} MB`, h: 260,
    alt: 'Line chart of JavaScript memory over 30 scene days.',
  });
}
