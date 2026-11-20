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
| **On screen, normal laptop** | The page's script uses about **16–19% of one CPU core** at the default 30 fps. The graphics chip draws the pixels. |
| **On screen, no graphics acceleration** | 65–100% of one core (the browser draws in software). Adaptive quality brings the dark theme from 100% to 66%. |
| **Nobody looking** | **0%.** It stops when scrolled out of view, in a hidden tab or minimised window, and after 5 minutes without input. Any input wakes it. |
| **Memory** | 6–45 MB of JavaScript. Flat over a month of running (below). |
| **Loading** | The page paints first (first paint 576 → **340 ms** since 0.3.0). The scene is built after the page has loaded. |

## Adaptive quality

When frames run slow, the scene steps down on its own: to 20 fps, then a pixel ratio of 1, then 15 fps.

![Main-thread time, quality fixed and adaptive](performance/adaptive.svg)

## When nobody is looking

![Browser CPU on screen, idle, scrolled out of view and for an empty tab](performance/at-rest.svg)

## Loading

![Long tasks while the page loads, 0.3.0 against 0.4.0](performance/startup.svg)

Building the world and baking its bitmaps still takes about 280 ms of main-thread work, now after the page's first
paint instead of before it. Total blocking time went from 191 to 134 ms.

## A month

Thirty days of scene time, fast-forwarded (the simulation stepped exactly as the live loop steps it) and sampled
once a day:

![JavaScript memory over 30 scene days](performance/month.svg)

Nothing grows. Memory settles at 25–36 MB after the first day, and day 30 ends lower than day 1. The number of
things moving swings between about 100 and 180 with the traffic, without climbing. A simulation step costs
21–25 µs and a frame 15–22 ms on day 30 as on day 1. A page left open for a month behaves as it did in its first
minute.

## Remaining limits

- **No graphics acceleration and a slow CPU together** (a remote desktop on an old laptop): even the lowest quality
  level keeps one core busy, at about 9 fps on a CPU 4× slower than the test machine.
- **Very large canvases:** above about 3 million device pixels (2560×1440, or 1600×860 on a 1.5× density screen)
  the page's own script time jumps from about 16% to 64–94% of a core in software drawing, against a steady 16% up
  to 1920×1080. Not yet explained. Adaptive quality's step to a pixel ratio of 1 takes most screens back under it;
  worth a look before showing the scene full-screen on big monitors.
- **The dark theme costs more to draw** (window glow, light on the ground, headlights). Only a machine without
  graphics acceleration notices.
- **The first build** is about 280 ms of main-thread work in three tasks of 70–110 ms, roughly 1 s on a slow
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
