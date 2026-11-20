import { describe, expect, it } from 'vitest';
import { Pacer, qualityLevels } from './pacer';

/** Frames the pacer lets through in one second of refreshes at `hz`, capped at `fps`. */
function drawn(hz: number, fps: number) {
  const p = new Pacer();
  let n = 0;
  for (let i = 0; i < hz; i++) if (p.tick((i * 1000) / hz, fps)) n++;
  return n;
}

/** Feeds `seconds` of frames at `rate` a second, each costing `cost` ms; true if the pacer asked to step down. */
function judged(p: Pacer, from: number, seconds: number, rate: number, cost: number, fps: number) {
  let isSlow = false;
  for (let t = from; t < from + seconds * 1000; t += 1000 / rate) isSlow = p.record(t, cost, fps) || isSlow;
  return isSlow;
}

describe('Pacer.tick', () => {
  it('draws at the frame cap on common refresh rates', () => {
    for (const hz of [50, 60, 75, 90, 120, 144]) expect(Math.abs(drawn(hz, 30) - 30)).toBeLessThanOrEqual(1);
  });

  it('draws every refresh without a cap, or when the cap is above the refresh rate', () => {
    expect(drawn(60, 0)).toBe(60);
    expect(drawn(60, 120)).toBe(60);
  });
});

describe('Pacer.record', () => {
  it('is content with frames on time and cheap', () => {
    expect(judged(new Pacer(), 1000, 10, 30, 5, 30)).toBe(false);
  });

  it('asks to step down when frames fall short of the cap', () => {
    expect(judged(new Pacer(), 1000, 3, 22, 5, 30)).toBe(true);
  });

  it('asks to step down when each frame takes over half its time', () => {
    expect(judged(new Pacer(), 1000, 3, 30, 20, 30)).toBe(true);
  });

  it('does not judge while settling, nor across a pause', () => {
    const p = new Pacer();
    p.settle(1000);
    expect(judged(p, 1000, 1.4, 10, 5, 30)).toBe(false);
    // a hidden tab: a long gap, then frames on time again
    expect(judged(p, 20_000, 3, 30, 5, 30)).toBe(false);
  });

  it('never judges without a frame cap', () => {
    expect(judged(new Pacer(), 1000, 3, 5, 100, 0)).toBe(false);
  });
});

describe('qualityLevels', () => {
  it('lowers the frame rate, then the pixel density, then the frame rate again', () => {
    expect(qualityLevels(30, 2, 2)).toEqual([
      { fps: 30, dpr: 2 },
      { fps: 20, dpr: 2 },
      { fps: 20, dpr: 1 },
      { fps: 15, dpr: 1 },
    ]);
  });

  it('skips steps that would change nothing', () => {
    expect(qualityLevels(30, 2, 1)).toEqual([
      { fps: 30, dpr: 1 },
      { fps: 20, dpr: 1 },
      { fps: 15, dpr: 1 },
    ]);
    expect(qualityLevels(15, 1, 2)).toEqual([{ fps: 15, dpr: 1 }]);
  });

  it('keeps a pixel ratio the host set below 1', () => {
    expect(qualityLevels(30, 0.75, 2).every((q) => q.dpr === 0.75)).toBe(true);
  });
});
