// The scene's options and its framing: the composed view the city was laid out to fill, how far a wide box may
// reach into the outskirts, and the camera that fits a box of any shape.

export type Theme = 'light' | 'dark';
export type Fit = 'cover' | 'contain';

export interface SceneOptions {
  theme: Theme;
  /** simulation speed multiplier (1 = real time) */
  speed: number;
  /** how busy the scene is, 0.3 … 1.5 */
  density: number;
  seed: number;
  fit: Fit;
  /** focal point used when `cover` crops the scene, 0…1 on each axis */
  focusX: number;
  focusY: number;
  maxDpr: number;
  paused: boolean;
  /** extra zoom on top of the fit (1 = fit exactly) */
  zoom: number;
}

export const DEFAULTS: SceneOptions = {
  theme: 'light',
  speed: 1,
  density: 1,
  seed: 7,
  fit: 'cover',
  focusX: 0.5,
  focusY: 0.5,
  maxDpr: 2,
  paused: false,
  zoom: 1,
};

/** The composed view in design units; the scene was laid out to fill it. */
export const FRAME = { cx: 0, cy: 47.5, w: 121.2, h: 65 };
export const ASPECT = FRAME.w / FRAME.h;
/**
 * How far a wide view may reach. A box wider than ASPECT shows more of the outskirts on both sides rather than
 * cropping the middle of the scene away: it keeps at least `minH` of the frame's height, up to `w` across.
 */
export const WIDE = { w: 210, minH: FRAME.h * 0.7 };

/**
 * The camera for a W x H box (CSS pixels): the zoom (CSS pixels per design unit), the centre of the view and its
 * half width and height in design units.
 */
export function fitView(W: number, H: number, o: Pick<SceneOptions, 'fit' | 'zoom' | 'focusX' | 'focusY'>) {
  // the frame to fill: the classic one, or for a wide box in cover mode a wider, shorter one into the outskirts
  let fw = FRAME.w, fh = FRAME.h;
  if (o.fit === 'cover' && W / H > ASPECT) {
    fh = Math.max(WIDE.minH, FRAME.w / (W / H));
    fw = Math.min(WIDE.w, fh * (W / H));
    fh = fw / (W / H);
  }
  const zoom = (o.fit === 'cover' ? Math.max(W / fw, H / fh) : Math.min(W / FRAME.w, H / FRAME.h)) * o.zoom;
  const hw = W / (2 * zoom), hh = H / (2 * zoom);
  // when cropping, slide the view towards the focal point without leaving the frame
  const slackX = Math.max(0, FRAME.w / 2 - hw), slackY = Math.max(0, FRAME.h / 2 - hh);
  const cx = FRAME.cx + (o.focusX - 0.5) * 2 * slackX;
  const cy = FRAME.cy + (o.focusY - 0.5) * 2 * slackY;
  return { zoom, cx, cy, hw, hh };
}
