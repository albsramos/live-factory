// Owns the Scene behind one <LivingCity>: starts it once the page has loaded, keeps it sized, visible and themed,
// holds it still while nobody uses the page, and tears it down when the element goes away.
//
// It is driven from a ref callback rather than effects. React calls the callback in its commit phase with the element
// (mount, or new options) and with null (unmount, or the old callback being replaced). When options change, React
// detaches the old callback and attaches the new one in the same commit, so a detach is only acted on if the same
// element doesn't come straight back.

import { DEFAULTS, type Fit } from '../engine/frame';
import { Scene } from '../engine/scene';
import { resolveTheme, watchTheme, type ThemeChoice } from '../theme';
import { afterLoad } from './afterLoad';
import { watchIdle, type IdleWatch } from './idleWatch';

export interface CityOptions {
  theme: ThemeChoice;
  speed: number;
  density: number;
  seed: number;
  fit: Fit;
  focusX: number;
  focusY: number;
  zoom: number;
  maxDpr: number;
  maxFps: number;
  isAdaptive: boolean;
  idleMinutes: number;
  isPaused: boolean;
  isReducedMotionIgnored: boolean;
  isBranded: boolean;
}

const reducedQuery = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null);

export class CityController {
  private el: HTMLDivElement | null = null;
  private scene: Scene | null = null;
  private stop: (() => void) | null = null;
  private cancelStart: (() => void) | null = null;
  private idle: IdleWatch | null = null;
  private isDetachPending = false;
  private isMotionReduced = false;
  private isIdle = false;
  private opts: CityOptions = {
    ...DEFAULTS, theme: 'auto', focusX: 0.5, focusY: 0.5, zoom: 1, isAdaptive: true, idleMinutes: 5, isPaused: false, isReducedMotionIgnored: false, isBranded: false,
  };

  /** The ref callback's work: an element mounts (or updates with new options); null tears down, unless it comes back. */
  attach(el: HTMLDivElement | null, opts: CityOptions) {
    this.opts = opts;
    if (!el) {
      this.isDetachPending = true;
      queueMicrotask(() => {
        if (this.isDetachPending) this.teardown();
      });
      return;
    }
    this.isDetachPending = false;
    if (el === this.el) this.apply();
    else {
      this.teardown();
      this.el = el;
      this.apply();
      // building the world is a few hundred milliseconds of work: let the page load and settle first
      this.cancelStart = afterLoad(() => {
        this.cancelStart = null;
        this.start(el);
      });
    }
  }

  private start(el: HTMLDivElement) {
    const canvas = el.querySelector('canvas');
    if (!canvas) return;
    const rm = reducedQuery();
    this.isMotionReduced = !!rm?.matches;
    let s: Scene;
    try {
      s = new Scene(canvas, this.sceneOptions(el));
    } catch {
      // no 2D canvas (a very old browser, or a test DOM): leave the ground colour showing
      return;
    }
    this.scene = s;
    this.apply();
    const rect = el.getBoundingClientRect();
    s.resize(rect.width, rect.height);
    // fade the canvas in once its first frame is drawn
    requestAnimationFrame(() => {
      if (this.scene === s) canvas.dataset.state = 'running';
    });
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      s.resize(r.width, r.height);
    });
    ro.observe(el);
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((e) => s.setVisible(e[0].isIntersecting)) : null;
    io?.observe(el);
    const unwatch = watchTheme(el, () => this.apply());
    const onReduced = () => {
      this.isMotionReduced = !!rm?.matches;
      this.apply();
    };
    rm?.addEventListener?.('change', onReduced);
    const idle = watchIdle(() => this.opts.idleMinutes * 60_000, (isIdle) => {
      this.isIdle = isIdle;
      this.apply();
    });
    this.idle = idle;
    this.stop = () => {
      ro.disconnect();
      io?.disconnect();
      unwatch();
      rm?.removeEventListener?.('change', onReduced);
      idle.stop();
      delete canvas.dataset.state;
    };
  }

  private teardown() {
    this.isDetachPending = false;
    this.cancelStart?.();
    this.cancelStart = null;
    this.stop?.();
    this.stop = null;
    this.idle = null;
    this.isIdle = false;
    this.scene?.destroy();
    this.scene = null;
    this.el = null;
  }

  private sceneOptions(el: HTMLDivElement) {
    const o = this.opts;
    return {
      theme: o.theme === 'auto' ? resolveTheme(el) : o.theme,
      speed: o.speed,
      density: o.density,
      seed: o.seed,
      fit: o.fit,
      focusX: o.focusX,
      focusY: o.focusY,
      zoom: o.zoom,
      maxDpr: o.maxDpr,
      maxFps: o.maxFps,
      adaptive: o.isAdaptive,
      paused: o.isPaused || this.isIdle || (this.isMotionReduced && !o.isReducedMotionIgnored),
      branded: o.isBranded,
    };
  }

  private apply() {
    const el = this.el;
    if (!el) return;
    const o = this.sceneOptions(el);
    // the box's ground colour (LivingCity.module.css) follows the theme in use, `auto` resolved
    el.dataset.ground = o.theme;
    if (!this.scene) return;
    this.scene.set(o);
    this.idle?.refresh();
  }
}
