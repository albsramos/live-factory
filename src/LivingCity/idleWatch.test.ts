import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { watchIdle } from './idleWatch';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('watchIdle', () => {
  it('goes idle after the wait without input, and wakes on the next input', () => {
    const seen: boolean[] = [];
    const w = watchIdle(() => 60_000, (v) => seen.push(v));
    vi.advanceTimersByTime(59_000);
    expect(seen).toEqual([]);
    vi.advanceTimersByTime(2_000);
    expect(seen).toEqual([true]);
    window.dispatchEvent(new Event('pointermove'));
    expect(seen).toEqual([true, false]);
    w.stop();
  });

  it('starts the wait again on every input', () => {
    const seen: boolean[] = [];
    const w = watchIdle(() => 60_000, (v) => seen.push(v));
    vi.advanceTimersByTime(50_000);
    window.dispatchEvent(new Event('keydown'));
    vi.advanceTimersByTime(50_000);
    expect(seen).toEqual([]);
    vi.advanceTimersByTime(11_000);
    expect(seen).toEqual([true]);
    w.stop();
  });

  it('never goes idle with a wait of 0, and wakes when the wait becomes 0', () => {
    let wait = 0;
    const seen: boolean[] = [];
    const w = watchIdle(() => wait, (v) => seen.push(v));
    vi.advanceTimersByTime(3_600_000);
    expect(seen).toEqual([]);
    wait = 1_000;
    w.refresh();
    vi.advanceTimersByTime(2_000);
    expect(seen).toEqual([true]);
    wait = 0;
    w.refresh();
    expect(seen).toEqual([true, false]);
    w.stop();
  });

  it('stops listening when stopped', () => {
    const seen: boolean[] = [];
    const w = watchIdle(() => 1_000, (v) => seen.push(v));
    w.stop();
    vi.advanceTimersByTime(5_000);
    window.dispatchEvent(new Event('pointerdown'));
    expect(seen).toEqual([]);
  });
});
