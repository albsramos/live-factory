# Performance

What `<LivingCity>` costs the people who look at it, measured in a browser and reproducible with
`scripts/measure-perf.mjs` (raw numbers: [`performance/results.json`](performance/results.json); 0.3.0's:
[`results-0.3.0.json`](performance/results-0.3.0.json)).

**Verdict: fit for a busy landing page.** It costs our servers nothing and a visitor's machine little. It costs
nothing at all when nobody is looking, and backs off by itself on weak hardware.

## At a glance

| | |
|---|---|
| **Our servers** | Nothing. The scene runs in the visitor's browser and makes no network requests. Traffic, active users and backend events don't change its cost. |
| **Download** | 56 KB gzipped for the component. The whole demo site, React included, is 118 KB. |
| **On screen, normal laptop** | The page's script uses about **16% of one CPU core** at the default 30 fps. The graphics chip draws the pixels. |
| **On screen, no graphics acceleration** | 65–100% of one core (the browser draws in software). Adaptive quality brings the dark theme from 100% to 66%. |
| **Nobody looking** | **0%.** It stops when scrolled out of view, in a hidden tab or minimised window, and after 5 minutes without input. Any input wakes it. |
| **Memory** | About 5–15 MB of JavaScript. Flat over a month of running (below). |
| **Loading** | The page paints first (first paint 576 → **364 ms** since 0.3.0). The scene is built after the page has loaded. |

## Adaptive quality

When frames run slow, the scene steps down on its own: to 20 fps, then a pixel ratio of 1, then 15 fps.

![Main-thread time, quality fixed and adaptive](performance/adaptive.svg)

## When nobody is looking

![Browser CPU on screen, idle, scrolled out of view and for an empty tab](performance/at-rest.svg)

## Loading

![Long tasks while the page loads, 0.3.0 against 0.4.0](performance/startup.svg)

Building the world and baking its bitmaps still takes about 340 ms of main-thread work, now after the page's first
paint instead of before it.

## A month

MONTH_PLACEHOLDER

## Remaining limits

- **No graphics acceleration and a slow CPU together** (a remote desktop on an old laptop): even the lowest quality
  level keeps one core busy, at about 9 fps on a CPU 4× slower than the test machine.
- **Very large canvases:** at 2560×1440 the page's own script time jumps from 16% to 64% of a core, against a
  steady 16% up to 1920×1080. Not yet explained: worth a look before showing the scene full-screen on big monitors.
- **The dark theme costs more to draw** (window glow, light on the ground, headlights). Only a machine without
  graphics acceleration notices.
- **The first build** is about 340 ms of main-thread work in two or three tasks over 50 ms, roughly 1 s on a slow
  laptop. It comes after first paint, but a click in that moment waits.

## How it was measured

Headless Chromium on a 4-core Intel Xeon (2.1 GHz) with **no GPU**, so drawing happens in software: a worst case.
*Page script* is what a machine with a graphics chip pays; *main thread* adds software drawing. Percentages are of
one CPU core (a 4-core laptop has 400%). Slow laptops are stood in for by Chromium's CPU throttling. To measure
again:

```sh
npm run build && npm run build:site
node scripts/measure-perf.mjs --month   # about 50 minutes; without --month about 12
node scripts/perf-charts.mjs
```
