// Owns the Scene behind one <LivingCity>: creates it when the wrapper element arrives, keeps it sized, visible and
// themed, and tears it down when the element goes away.
//
// It is driven from a ref callback rather than effects. React calls the callback in its commit phase with the element
// (mount, or new options) and with null (unmount, or the old callback being replaced). When options change, React
// detaches the old callback and attaches the new one in the same commit, so a detach is only acted on if the same
// element doesn't come straight back.

import { DEFAULTS, Scene, type Fit } from '../engine/scene';
import { resolveTheme, watchTheme, type ThemeChoice } from '../theme';

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
  isPaused: boolean;
  isReducedMotionIgnored: boolean;
}

/** Ground colour of each theme, shown before the first frame so the box never flashes the wrong colour. */
export const GROUND = { light: '#ebebef', dark: '#1b1c21' };

const reducedQuery = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null);

export class CityController {
  private el: HTMLDivElement | null = null;
  private scene: Scene | null = null;
  private stop: (() => void) | null = null;
  private isDetachPending = false;
  private isMotionReduced = false;
  private opts: CityOptions = {
    ...DEFAULTS, theme: 'auto', focusX: 0.5, focusY: 0.5, zoom: 1, isPaused: false, isReducedMotionIgnored: false,
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
      this.mount(el);
    }
  }

  private mount(el: HTMLDivElement) {
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
    this.el = el;
    this.scene = s;
    this.apply();
    const rect = el.getBoundingClientRect();
    s.resize(rect.width, rect.height);
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
    this.stop = () => {
      ro.disconnect();
      io?.disconnect();
      unwatch();
      rm?.removeEventListener?.('change', onReduced);
    };
  }

  private teardown() {
    this.isDetachPending = false;
    this.stop?.();
    this.stop = null;
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
      paused: o.isPaused || (this.isMotionReduced && !o.isReducedMotionIgnored),
    };
  }

  private apply() {
    const el = this.el;
    if (!el || !this.scene) return;
    const o = this.sceneOptions(el);
    this.scene.set(o);
    el.style.backgroundColor = GROUND[o.theme];
  }
}
