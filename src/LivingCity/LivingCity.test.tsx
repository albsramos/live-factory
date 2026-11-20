import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FRAME } from '../engine/frame';
import { darkPalette, lightPalette } from '../engine/palette';
import { LivingCity } from './LivingCity';
import css from './LivingCity.module.css?raw';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // jsdom has no 2D canvas, as in a very old browser: the component then just shows its ground colour
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

const render = (ui: ReactNode) => act(() => root.render(ui));
const box = () => host.firstElementChild as HTMLDivElement;

describe('LivingCity', () => {
  it('is decorative by default, with one canvas inside', () => {
    render(<LivingCity />);
    expect(box().getAttribute('aria-hidden')).toBe('true');
    expect(box().getAttribute('role')).toBeNull();
    expect(box().querySelectorAll('canvas')).toHaveLength(1);
  });

  it('describes itself as an image when given a label', () => {
    render(<LivingCity label="A factory town at work" />);
    expect(box().getAttribute('role')).toBe('img');
    expect(box().getAttribute('aria-label')).toBe('A factory town at work');
    expect(box().getAttribute('aria-hidden')).toBeNull();
  });

  it("shows the theme's ground before the first frame", () => {
    render(<LivingCity theme="dark" />);
    expect(box().dataset.ground).toBe('dark');
    render(<LivingCity theme="light" />);
    expect(box().dataset.ground).toBe('light');
  });

  it("keeps the host's class and style alongside its own", () => {
    render(<LivingCity className="hero" style={{ height: 520 }} />);
    expect(box().classList).toContain('hero');
    expect(box().classList.length).toBeGreaterThan(1);
    expect(box().style.height).toBe('520px');
  });

  it('keeps its element across option changes and unmounts cleanly', () => {
    render(<LivingCity speed={1} />);
    const el = box();
    render(<LivingCity speed={2} isPaused />);
    expect(box()).toBe(el);
    // turning the factory's lettering on is an option change too, not a remount
    render(<LivingCity speed={2} isPaused isBranded />);
    expect(box()).toBe(el);
    act(() => root.unmount());
    expect(host.childElementCount).toBe(0);
    root = createRoot(host);
  });
});

describe('LivingCity.module.css', () => {
  it("matches the scene's shape and the palettes' ground colours", () => {
    expect(css).toContain(`aspect-ratio: ${FRAME.w} / ${FRAME.h};`);
    expect(css).toContain(`background-color: ${lightPalette().ground};`);
    expect(css).toContain(`background-color: ${darkPalette().ground};`);
  });
});
