// The soft shadows baked into the ground layer (Scene.renderGround): contact shadows around building bases, then the
// cast shadows of everything static. Both are blurred with the offset-shadow trick: the shapes themselves are drawn
// far to the left, off the canvas, and only their blurred shadow is shifted back into place.

import type { Palette } from './palette';
import { BoxItem, type Static } from './statics';

const C = 0.8660254;

export function groundShadows(g: CanvasRenderingContext2D, statics: Static[], pal: Palette, scale: number, view: { x0: number; x1: number }) {
  // the offset must clear every shape in the world, not just the view
  let minX = Infinity, maxX = -Infinity;
  for (const s of statics) {
    minX = Math.min(minX, (s.x0 - s.y1) * C);
    maxX = Math.max(maxX, (s.x1 - s.y0) * C);
  }
  const off = Math.max(maxX, view.x1) - Math.min(minX, view.x0) + 60;
  const blurred = (color: string, blur: number, build: () => void) => {
    g.save();
    g.translate(-off, 0);
    g.beginPath();
    build();
    g.shadowColor = color;
    g.shadowBlur = blur * scale;
    g.shadowOffsetX = off * scale;
    g.fillStyle = '#000';
    g.fill();
    g.restore();
  };
  blurred(pal.ao, 1.6, () => {
    for (const s of statics) {
      if (!(s instanceof BoxItem) || s.z0 > 0.01 || s.z1 < 1.5) continue;
      if ((s.x1 - s.x0) * (s.y1 - s.y0) < 3) continue;
      const X = [s.x0 + 0.1, s.x1 - 0.1], Y = [s.y0 + 0.1, s.y1 - 0.1];
      g.moveTo((X[0] - Y[0]) * C, (X[0] + Y[0]) * 0.5);
      g.lineTo((X[1] - Y[0]) * C, (X[1] + Y[0]) * 0.5);
      g.lineTo((X[1] - Y[1]) * C, (X[1] + Y[1]) * 0.5);
      g.lineTo((X[0] - Y[1]) * C, (X[0] + Y[1]) * 0.5);
      g.closePath();
    }
  });
  blurred(pal.shadow, 0.35, () => {
    for (const s of statics) s.shadow?.(g);
  });
}
