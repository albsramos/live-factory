# Performance: CPU consumption and optimal scene settings

What `<LivingCity>` costs the machine of someone who has it open: a second, an afternoon, or a month on a budget
laptop. Every number here comes from `scripts/measure-perf.mjs` (raw results in
[`performance/results.json`](performance/results.json)) and every chart from `scripts/perf-charts.mjs`, so they can
be measured again after any change:

```sh
npm run build && npm run build:site
node scripts/measure-perf.mjs --month   # about 50 minutes; leave out --month for about 8
node scripts/perf-charts.mjs
```

## The short version

| Question | Answer |
|---|---|
| Does it put any load on our servers? | **No.** The scene runs entirely in the visitor's browser and makes no network requests. Serving it is serving static files: **55 KB** gzipped for the component, **117 KB** for the whole demo site's JavaScript including React. Thousands of active users, or millions of backend events a day, change nothing for it. |
| What does a visitor's machine pay while it is on screen? | The page's own script: **17–22% of one CPU core** on the test machine. Drawing the pixels goes to the graphics chip on any normal laptop. Without a graphics chip (see *Weak spots*) the browser also draws in software, and the total reaches **70–100% of one core**. |
| And when it is not on screen? | **Nothing** (0.2% of a core, the same as an empty tab). It stops when scrolled out of view, in a hidden tab or a minimised window, and holds still for visitors who ask for reduced motion. |
| Left open for a month? | Memory, the number of things moving and the cost of a frame stay flat from the first day to the thirtieth (section 6). Nothing piles up and nothing slows down. What it does cost is the steady load above, for as long as the window is visible. |
| Does a slow laptop break it? | No. On a CPU slowed down 4× the scene still runs and still looks right, at about 9 frames a second instead of 30, with the CPU core busy (section 3). |
| Loading? | It blocks the page for about **190 ms** once, while it builds the world. On a slow laptop that becomes roughly half a second to a second (section 4). |

**Verdict:** a reasonable choice for a landing page. Its server cost is zero and its download is small. It costs
the visitor's machine nothing when out of view and a modest, steady amount when in view on ordinary hardware with a
graphics chip. There are four weak spots, listed under *Weak spots and what to do about them* with fixes, and the
biggest is machines without graphics acceleration.

## How it was measured

- **Machine:** a cloud container with a 4-core Intel Xeon at 2.1 GHz, headless Chromium, **no GPU**. The browser
  therefore draws the canvas in software on the CPU. That makes these numbers a **worst case for drawing**: on a
  laptop with integrated graphics (any Intel UHD/Iris, AMD Radeon or Apple chip) the drawing moves to the graphics
  chip.
- **Two numbers per measurement, to separate those cases:**
  - *Page script* is the time the page's JavaScript runs: the simulation, plus issuing the drawing commands. On a
    machine with a GPU that is roughly all the main thread does.
  - *Main thread* adds the time the browser spends turning those commands into pixels in software. Only a machine
    without graphics acceleration pays it.
- **Percentages are of one CPU core.** A budget laptop has 4 cores, so 25% of one core is about 6% of the whole
  CPU.
- **A slower laptop** is stood in for by Chromium's CPU throttling, which slows the page down by a set factor.
  Budget laptop chips (Celeron, Pentium Silver, Core i3 U-series, Ryzen 3) are roughly 1.5–3× slower per core than
  the test machine.
- Each steady-state figure is a 20-second average, taken after the scene had run for 2 seconds.

## 1. The frame cap

Since 0.3.0 the scene draws at most 30 frames a second (`maxFps`, default 30). It moves slowly, so 30 looks the
same as 60.

![Main-thread time by frame cap, light and dark theme](performance/fps-cap.svg)

| Frame cap | Light: page script | Light: main thread | Dark: page script | Dark: main thread | Frames drawn (light / dark) |
|---|---|---|---|---|---|
| every refresh | 23% | 100% | 15% | 100% | 43 / 24 |
| 30 fps (default) | 17% | 75% | 15% | 100% | 30 / 25 |
| 20 fps | 12% | 53% | 13% | 87% | 20 / 20 |
| 15 fps | 11% | 45% | 10% | 65% | 15 / 15 |

- Lowering the cap lowers the cost almost in proportion. In software drawing, `maxFps={15}` costs about **60% of
  what 30 fps costs**.
- *Every refresh* only reached about 43 frames a second here, because software drawing filled the core. On a
  machine with a GPU it would reach 60, 120 or 144. That is where the cap saves the most: **half the work at 60 Hz
  and almost five times less at 144 Hz**.
- **The dark (night) theme costs more to draw:** window glow, light spilling onto the ground, and headlight beams. In
  software it cannot reach 30 frames a second (about 24) and fills a core. With a GPU this is a matter of fill rate
  the graphics chip handles easily.

## 2. Screen size

The canvas fills its box, so a bigger screen means more pixels.

![Main-thread time by screen size](performance/screen-size.svg)

| Canvas size | Page script | Main thread | Frames drawn | Frame time (median / 95th percentile) |
|---|---|---|---|---|
| 1366×768 | 17% | 70% | 30 | 5.1 / 7.7 ms |
| 1600×860 | 17% | 76% | 30 | 5.1 / 7.3 ms |
| 1920×1080 | 17% | 89% | 30 | 5.1 / 7.4 ms |
| 2560×1440 | 65% | 100% | 27 | 23.4 / 29.2 ms |

Up to 1920×1080 the page script stays the same (about 17%), and only the software drawing grows with the pixels. At
2560×1440 the script cost jumps to about 65% and frames take about 23 ms instead of 5. That needs looking into
(*Weak spots*, 4). `maxDpr={1}` keeps a high-density screen from drawing up to 4× the pixels.

## 3. A slower laptop

![Frames drawn per second as the CPU slows down](performance/slow-cpu.svg)

| CPU | Frames drawn | Frame time (median / 95th percentile) | Page script | Main thread |
|---|---|---|---|---|
| test machine | 30 | 5.0 / 7.4 ms | 16% | 68% |
| 2× slower | 20 | 11.4 / 16.9 ms | 26% | 100% |
| 4× slower | 9 | 25.8 / 36.8 ms | 26% | 100% |
| 6× slower | 6 | 40.6 / 60.5 ms | 26% | 100% |

The scene keeps running at its own pace. When the CPU can't draw 30 frames a second, the simulation still advances
in real time and the scene draws fewer frames. It never falls behind or speeds up to catch up. The cost is that the
page's main thread is then fully busy, which can make the rest of the page respond slowly (*Weak spots*, 1).

## 4. Loading the page

![Long tasks while the website loads](performance/startup.svg)

The built website at 1366×768: first paint at **576 ms** (served locally, so this is all page work, not network).
When the component mounts it builds the world, runs about 40 simulated seconds so the first frame is already busy,
and renders every building into a cached bitmap. That shows up as three long tasks of 128, 120 and 93 ms, a **total
blocking time of 191 ms**. Lighthouse counts blocking time from 200 ms against a page, so this is at the edge on a
fast machine. On a laptop 2–4× slower it becomes roughly 0.5–1 s during which a click on the page waits.

It happens once per page load, and again only when the canvas changes size or theme (the bitmaps are re-rendered).
*Weak spots*, 2, has the fix.

## 5. Out of view

![Browser CPU on screen, scrolled out of view and for an empty tab](performance/offscreen.svg)

| Built website at 1366×768 | Whole browser CPU | Page script | JavaScript memory in use |
|---|---|---|---|
| On screen | 79.5% | 21.9% | 4.8 MB |
| Scrolled out of view | **0.2%** | 0% | 4.7 MB |
| Empty tab, for comparison | 0.0% | 0% | 5.0 MB |

*Whole browser CPU* is every Chromium process together (the page, the graphics process, the browser), read from the
operating system. Here it includes software drawing, so on screen it is the no-GPU worst case.

The scene watches itself with an `IntersectionObserver` and stops its frame loop the moment it leaves the screen.
Browsers also stop the loop on their own in a background tab or a minimised window, and Chrome on Windows and macOS
does the same for a window that is completely covered by others. A landing page whose hero has been scrolled past
costs nothing.

## 6. A month

MONTH_TEXT

## Weak spots and what to do about them

WEAK_TEXT

## Recommended settings for a landing page

SETTINGS_TEXT
