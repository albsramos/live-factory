import { describe, expect, it } from 'vitest';
import { darkPalette, lightPalette } from '../palette';
import { paintFor } from './paints';

describe.each([
  ['light', lightPalette()],
  ['dark', darkPalette()],
])('paintFor (%s)', (_name, pal) => {
  it('offers only the Model Y colours: white (twice), silver, graphite and black', () => {
    expect(pal.paints).toHaveLength(5);
  });

  it('lets the SUV wear any of them', () => {
    for (const p of pal.paints) expect(paintFor(pal, 'suv', p)).toBe(p);
  });

  it('always paints the pickup silver', () => {
    for (const p of pal.paints) expect(paintFor(pal, 'pickup', p)).toBe(pal.paints[2]);
  });

  it('leaves colours from outside the list alone', () => {
    expect(paintFor(pal, 'pod', pal.gold)).toBe(pal.gold);
    expect(paintFor(pal, 'semi', pal.white)).toBe(pal.white);
  });
});
