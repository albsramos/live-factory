import { useCallback, useState, type CSSProperties } from 'react';
import { DEFAULTS, type Fit } from '../engine/frame';
import type { ThemeChoice } from '../theme';
import { CityController } from './cityController';
import styles from './LivingCity.module.css';

export interface LivingCityProps {
  /**
   * `auto` (default) matches the page: a `data-theme="dark"` (or `data-bs-theme`, `data-color-scheme`, …) on an
   * ancestor, a `dark` class on <html> or <body>, or else the system setting, and follows it when it changes.
   * `light` and `dark` force one look.
   */
  theme?: ThemeChoice;
  /** Simulation speed, 1 = real time. Default 1. */
  speed?: number;
  /** How busy the streets are, from 0.3 (calm) to 1.5 (rush hour). Default 1. */
  density?: number;
  /** Seed for the random layout of people and traffic. Default 7. */
  seed?: number;
  /**
   * `cover` fills the box (default), cropping the scene's middle less the wider the box gets: a wide banner shows
   * more of the outskirts instead. `contain` shows the whole height, with the outskirts filling the sides.
   */
  fit?: Fit;
  /** Where to keep the focus when `cover` crops, as [x, y] from 0 to 1. Default [0.5, 0.5]. */
  focus?: [number, number];
  /** Extra zoom on top of the fit. Default 1. */
  zoom?: number;
  /** Freeze the scene on its current frame. */
  isPaused?: boolean;
  /** Cap on device pixel ratio, to trade sharpness for speed. Default 2. */
  maxDpr?: number;
  /** Keep moving even when the visitor asks for reduced motion (by default the scene then holds still). */
  isReducedMotionIgnored?: boolean;
  /** Accessible description; the scene is decorative when omitted. */
  label?: string;
  /** Added to the wrapper `div`; its rules win over the component's own defaults. */
  className?: string;
  style?: CSSProperties;
}

/**
 * A self-running isometric city: cars and robotaxis drive, semis get loaded, a crane swings, and humanoid robots
 * walk and work among the people. Fills its container's width at the scene's own shape, or a box you size.
 *
 * The scene lives in a CityController, driven by the wrapper's ref callback (no effects): React calls it with the
 * element on mount and whenever an option changes, and with null on unmount.
 */
export function LivingCity({
  theme = 'auto',
  speed = DEFAULTS.speed,
  density = DEFAULTS.density,
  seed = DEFAULTS.seed,
  fit = DEFAULTS.fit,
  focus,
  zoom = 1,
  isPaused = false,
  maxDpr = DEFAULTS.maxDpr,
  isReducedMotionIgnored = false,
  label,
  className,
  style,
}: LivingCityProps) {
  const [city] = useState(() => new CityController());
  const focusX = focus?.[0] ?? 0.5, focusY = focus?.[1] ?? 0.5;
  // runs in the commit phase whenever an option changes (see CityController)
  const attach = useCallback(
    (el: HTMLDivElement | null) =>
      city.attach(el, { theme, speed, density, seed, fit, focusX, focusY, zoom, maxDpr, isPaused, isReducedMotionIgnored }),
    [city, theme, speed, density, seed, fit, focusX, focusY, zoom, maxDpr, isPaused, isReducedMotionIgnored],
  );

  return (
    <div
      ref={attach}
      className={className ? `${styles.root} ${className}` : styles.root}
      style={style}
      data-ground={theme === 'dark' ? 'dark' : 'light'}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <canvas className={styles.canvas} />
    </div>
  );
}
