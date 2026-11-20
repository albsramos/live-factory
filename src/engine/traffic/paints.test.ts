import { describe, expect, it } from 'vitest';
import { darkPalette, lightPalette } from '../palette';
import { paintFor } from './paints';

describe.each([
  ['light', lightPalette()],
  ['dark', darkPalette()],
])('paintFor (%s)', (_name, pal) => {
  // white is listed twice, so it comes up twice as often
  const [white, white2, silver, , graphite, black] = pal.paints;

  it('keeps the SUV to white, silver, graphite and black', () => {
    const allowed = [white, white2, silver, graphite, black];
    for (const p of pal.paints) expect(allowed).toContain(paintFor(pal, 'suv', p));
  });

  it('leaves an SUV already in one of its colours as it is', () => {
    for (const p of [white, white2, silver, graphite, black]) expect(paintFor(pal, 'suv', p)).toBe(p);
  });

  it('always paints the pickup silver', () => {
    for (const p of pal.paints) expect(paintFor(pal, 'pickup', p)).toBe(silver);
  });

  it('lets cars wear any paint, and leaves colours from outside the list alone', () => {
    for (const p of pal.paints) expect(paintFor(pal, 'car', p)).toBe(p);
    expect(paintFor(pal, 'pod', pal.gold)).toBe(pal.gold);
    expect(paintFor(pal, 'semi', pal.white)).toBe(pal.white);
  });
});
