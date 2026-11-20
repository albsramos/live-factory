// Frame pacing and adaptive quality. The pacer decides which screen refreshes get a frame, so the scene draws at its
// frame cap on any refresh rate (60, 50, 120 or 144 Hz), and watches whether frames keep up. When they don't, the
// scene steps down to the next quality level: fewer frames a second, then fewer pixels.

export interface Quality {
  /** frames a second at most */
  fps: number;
  /** cap on the device pixel ratio */
  dpr: number;
}

/** seconds of frames judged together */
const WINDOW = 2;
/** seconds not judged after a start, a resize or a theme change, while the bitmaps are baked again */
const SETTLE = 1.5;
/** a gap between frames this long (ms) is a pause (a hidden tab, a stopped loop), not a slow frame */
const GAP = 500;

/**
 * The quality levels, best first, for a scene capped at `maxFps` and `maxDpr` on a screen of `deviceDpr`: each
 * level lowers the frame rate or the pixel density, never both at once. Lowest is 15 fps at a pixel ratio of 1 or less.
 */
export function qualityLevels(maxFps: number, maxDpr: number, deviceDpr: number): Quality[] {
  const top = Math.min(maxDpr, deviceDpr), low = Math.min(top, 1);
  const steps: Quality[] = [
    { fps: maxFps, dpr: top },
    { fps: Math.min(maxFps, 20), dpr: top },
    { fps: Math.min(maxFps, 20), dpr: low },
    { fps: Math.min(maxFps, 15), dpr: low },
  ];
  return steps.filter((q, i) => i === 0 || q.fps !== steps[i - 1].fps || q.dpr !== steps[i - 1].dpr);
}

export class Pacer {
  private due = 0;
  private lastFrame = 0;
  private windowStart = 0;
  private frames = 0;
  private costs: number[] = [];
  private settleUntil = 0;

  /** Whether the refresh at `now` (ms) should draw a frame, at `fps` frames a second at most (0 = every refresh). */
  tick(now: number, fps: number): boolean {
    if (fps <= 0) return true;
    const interval = 1000 / fps;
    // a little slack, so timing jitter doesn't skip a refresh that is due
    const slack = Math.min(4, interval / 4);
    if (!this.due || now - this.due > interval) {
      // the first frame, or so far behind that catching up makes no sense: start counting again from now
      this.due = now + interval;
      return true;
    }
    if (now < this.due - slack) return false;
    this.due += interval;
    return true;
  }

  /** Don't judge frames for a moment: something expensive (baking) is about to happen. */
  settle(now: number) {
    this.settleUntil = now + SETTLE * 1000;
    this.windowStart = 0;
  }

  /**
   * Note a frame drawn at `now` that took `cost` ms of the page's own time. Returns true when the last WINDOW
   * seconds fell short of `fps` (the browser couldn't draw them in time) or each frame took over half its time.
   */
  record(now: number, cost: number, fps: number): boolean {
    const gap = now - this.lastFrame;
    this.lastFrame = now;
    if (fps <= 0 || now < this.settleUntil) return false;
    if (!this.windowStart || gap > GAP) {
      this.windowStart = now;
      this.frames = 0;
      this.costs.length = 0;
      return false;
    }
    this.frames++;
    this.costs.push(cost);
    const elapsed = (now - this.windowStart) / 1000;
    if (elapsed < WINDOW) return false;
    const achieved = this.frames / elapsed;
    const median = this.costs.sort((a, b) => a - b)[this.costs.length >> 1];
    this.windowStart = now;
    this.frames = 0;
    this.costs.length = 0;
    return achieved < fps * 0.85 || median > 500 / fps;
  }
}
