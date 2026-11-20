// What the playground lets you change, and how each setting is written in the URL.

import type { ThemeChoice } from 'live-factory';
import { patchSearch, useSearch } from '../../../shared/lib/searchParams';

/** `banner` (the default) is a 1630 × 520 strip showing the whole height; `classic` is the scene's own 1.86 : 1. */
export type Shape = 'banner' | 'classic';

export interface Settings {
  theme: ThemeChoice;
  speed: number;
  crowd: number;
  shape: Shape;
  isPaused: boolean;
  /** run even though the visitor asked for reduced motion (they pressed Play) */
  isMotionForced: boolean;
  /** the scene on the whole screen, so a link can open straight into it */
  isFull: boolean;
  /** the bare scene for a screen saver (`?saver`): no page round it, no controls, no cursor */
  isSaver: boolean;
}

export const SPEED = { min: 0.25, max: 3, step: 0.25 } as const;
export const CROWD = { min: 0.3, max: 1.5, step: 0.1 } as const;

const pick = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);

function number(v: string | null, fallback: number, range: { min: number; max: number }) {
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? Math.min(range.max, Math.max(range.min, n)) : fallback;
}

export function readSettings(search: string): Settings {
  const p = new URLSearchParams(search);
  return {
    theme: pick(p.get('theme'), ['auto', 'light', 'dark'], 'auto'),
    speed: number(p.get('speed'), 1, SPEED),
    crowd: number(p.get('crowd'), 1, CROWD),
    shape: pick(p.get('shape'), ['banner', 'classic'], 'banner'),
    isPaused: p.get('paused') === '1',
    isMotionForced: p.get('motion') === '1',
    isFull: p.get('full') === '1',
    isSaver: p.has('saver'),
  };
}

/** The playground's settings, read from the URL on every render (cheap) so there is one source of truth. */
export function useSettings() {
  return readSettings(useSearch());
}

// Writers. Defaults are left out of the URL so a plain link stays plain.
export const setTheme = (theme: ThemeChoice) => patchSearch({ theme: theme === 'auto' ? null : theme });
export const setSpeed = (speed: number) => patchSearch({ speed: speed === 1 ? null : String(speed) });
export const setCrowd = (crowd: number) => patchSearch({ crowd: crowd === 1 ? null : crowd.toFixed(1) });
export const setShape = (shape: Shape) => patchSearch({ shape: shape === 'banner' ? null : shape });
export const setFull = (isFull: boolean) => patchSearch({ full: isFull ? '1' : null });
export const pause = () => patchSearch({ paused: '1' });
/** Run the scene; `isOverridingMotion` when the visitor's reduced-motion setting is what holds it still. */
export const play = (isOverridingMotion: boolean) => patchSearch({ paused: null, motion: isOverridingMotion ? '1' : null });
