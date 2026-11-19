// The ground layer, drawn once into a cached bitmap: paved pads, plaza, lawns, roads with curbs and markings, and at
// night the light that falls from the windows.

import { C } from '../core';
import { arcPts, groundPoly, groundRect, lineW } from '../ground';
import type { Ctx } from '../draw';
import { windowSpill, type LitFace } from '../details';
import type { Palette } from '../palette';
import type { ChargingLot } from '../activities/chargingLot';
import type { Outskirts } from './outskirts';
import { POCKET_LAWN, POCKET_PATH } from './streetLife';

/** The ground layer: paved pads, plaza, lawns, roads with curbs and markings, and at night the light from windows. */
export function groundPainter(pal: Palette, lot: ChargingLot, outskirts: Outskirts) {
  const roads = (ctx: Ctx) => {
    groundRect(ctx, 68, -100, 76, 260);
    groundRect(ctx, 56, 42, 260, 50);
    groundRect(ctx, 44, 54, 52, 260);
    groundPoly(ctx, [...arcPts(56, 54, 12, Math.PI, Math.PI / 2, 18), ...arcPts(56, 54, 4, Math.PI * 1.5, -Math.PI / 2, 10)]);
    // rounded corners where the street meets the avenue
    for (const [cx, cy, ox, oy] of [[68, 42, -3, -3], [76, 42, 3, -3], [68, 50, -3, 3], [76, 50, 3, 3]]) {
      const ccx = cx + ox, ccy = cy + oy;
      const a0 = Math.atan2(cy + oy - ccy, cx - ccx);
      const a1 = Math.atan2(cy - ccy, cx + ox - ccx);
      let da = a1 - a0;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      groundPoly(ctx, [cx, cy, ...arcPts(ccx, ccy, 3, a0, da, 6)]);
    }
    // robotaxi bay
    groundPoly(ctx, [76, 53.5, 79.2, 57.5, 79.2, 70.5, 76, 74.5]);
  };

  // the glazed facades facing the camera: factory, dock wing (atrium and top band), pavilion, the home
  const litFaces: LitFace[] = [
    [26, 36, 26, 72, 1, 0], [-40, 72, 26, 72, 0, 1], [30, 26.6, 30, 35.4, 1, 0], [30, 0.4, 30, 25.6, 1, 0],
    [80, 38, 97, 38, 0, 1], [97, 26, 97, 38, 1, 0], [20.4, 84.2, 28.8, 84.2, 0, 1], [28.8, 75.6, 28.8, 84.2, 1, 0],
    ...outskirts.litFaces,
  ];
  const ground = (ctx: Ctx) => {
    // paved pads
    ctx.fillStyle = pal.pad;
    ctx.beginPath();
    // the truck yard, its gate off the avenue and its way out to the street
    groundRect(ctx, 30, -40, 66.4, 38.8);
    groundRect(ctx, 64, 6.4, 68.4, 28);
    groundRect(ctx, 64, -17.4, 68.4, -5);
    groundRect(ctx, 30, 72, 44, 140);
    groundRect(ctx, 54.5, 53, 66, 80.6);
    groundRect(ctx, 58.4, 50, 62.4, 53.2);
    groundRect(ctx, 51.8, 58.6, 54.7, 63.6);
    groundRect(ctx, 28.6, 85.2, 30, 89.8);
    groundRect(ctx, 54.5, 84.2, 66.4, 120);
    ctx.fill();
    outskirts.ground(ctx);
    // the truck's way out across the plaza corner
    ctx.strokeStyle = pal.pad;
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    lineW(ctx, 37, 75, 0, 45, 67, 0);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // a slightly lighter plaza in front of the factory and a lawn-ish park
    ctx.fillStyle = pal.plaza;
    ctx.beginPath();
    groundPoly(ctx, [26, 36, 41.6, 36, 41.6, 61.8, 37.4, 66.0, 37.4, 69.4, 26, 69.4]);
    groundPoly(ctx, [81, 53, 86, 53, 86, 64.2, 130, 64.2, 130, 100, 81, 100]);
    ctx.fill();
    // a grass verge between the truck yard and the avenue's pavement, broken where the semis turn in at the gate and
    // pull out across the exit (their trailers sweep those stretches)
    ctx.fillStyle = pal.lawn;
    ctx.beginPath();
    groundRect(ctx, 64.8, -40, 66.2, -17.8);
    groundRect(ctx, 64.8, -4.6, 66.2, 6.0);
    groundRect(ctx, 64.8, 28.4, 66.2, 38.6);
    ctx.fill();
    // the pocket park: grass with a path across it
    ctx.fillStyle = pal.lawn;
    ctx.strokeStyle = pal.lawn;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    groundPoly(ctx, POCKET_LAWN);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = pal.plaza;
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 1; i < POCKET_PATH.length; i++) lineW(ctx, POCKET_PATH[i - 1][0], POCKET_PATH[i - 1][1], 0, POCKET_PATH[i][0], POCKET_PATH[i][1], 0);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // apron joints
    ctx.strokeStyle = pal.night ? 'rgba(255,255,255,0.03)' : 'rgba(120,122,136,0.10)';
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    for (let y = -36; y < 38; y += 6) lineW(ctx, 44.4, y, 0, 66.4, y, 0);
    for (let x = 48; x < 66; x += 6) lineW(ctx, x, -40, 0, x, 38.8, 0);
    for (let y = 78; y < 140; y += 6) lineW(ctx, 30, y, 0, 44, y, 0);
    ctx.stroke();

    // roads with curbs
    ctx.beginPath();
    roads(ctx);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = pal.curbHi;
    ctx.lineWidth = 0.62;
    ctx.stroke();
    ctx.strokeStyle = pal.curbLo;
    ctx.lineWidth = 0.26;
    ctx.stroke();
    ctx.fillStyle = pal.road;
    ctx.fill();

    // lane markings
    ctx.strokeStyle = pal.roadLine;
    ctx.lineWidth = 0.15;
    ctx.setLineDash([2.2, 2.6]);
    ctx.beginPath();
    lineW(ctx, 72, -100, 0, 72, 41.2, 0);
    lineW(ctx, 72, 50.8, 0, 72, 260, 0);
    lineW(ctx, 56, 46, 0, 67.4, 46, 0);
    lineW(ctx, 76.6, 46, 0, 260, 46, 0);
    lineW(ctx, 48, 54, 0, 48, 260, 0);
    const arc = arcPts(56, 54, 8, Math.PI, Math.PI / 2, 16);
    for (let i = 0; i < arc.length; i += 2) {
      const X = (arc[i] - arc[i + 1]) * C, Y = (arc[i] + arc[i + 1]) * 0.5;
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    lineW(ctx, 76.1, 54, 0, 76.1, 74, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    // stop lines
    ctx.lineWidth = 0.28;
    ctx.beginPath();
    lineW(ctx, 68.3, 41.2, 0, 71.8, 41.2, 0);
    lineW(ctx, 72.2, 50.8, 0, 75.7, 50.8, 0);
    lineW(ctx, 67.4, 46.2, 0, 67.4, 49.7, 0);
    lineW(ctx, 76.6, 42.3, 0, 76.6, 45.8, 0);
    ctx.stroke();
    // zebra crossings
    ctx.fillStyle = pal.roadLine;
    ctx.beginPath();
    for (let x = 44.4; x < 51.7; x += 0.9) groundRect(ctx, x, 63.25, x + 0.45, 65.75);
    for (let x = 68.4; x < 75.7; x += 0.9) groundRect(ctx, x, 33.25, x + 0.45, 35.75);
    for (let x = 68.4; x < 75.7; x += 0.9) groundRect(ctx, x, 80.25, x + 0.45, 82.75);
    for (let y = 42.4; y < 49.7; y += 0.9) groundRect(ctx, 86.25, y, 88.75, y + 0.45);
    ctx.fill();
    // charging stalls
    ctx.strokeStyle = pal.roadLine;
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    for (const sx of lot.stalls) {
      for (const dx of [-1.5, 1.5]) {
        lineW(ctx, sx + dx, 61.9, 0, sx + dx, 66.6, 0);
        lineW(ctx, sx + dx, 67.4, 0, sx + dx, 72.2, 0);
      }
    }
    lineW(ctx, 54.9, 67, 0, 65.6, 67, 0);
    ctx.stroke();
    ctx.setLineDash([1.6, 1.6]);
    ctx.beginPath();
    lineW(ctx, 61.9, -6, 0, 61.9, 38.4, 0);
    lineW(ctx, 58.1, 0, 0, 58.1, 38.4, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    // dock bays and the yard lane
    for (const y of [1.5, 7.5, 13.5, 19.5, 25.5]) lineW(ctx, 30.2, y, 0, 46, y, 0);
    // truck bay box
    lineW(ctx, 35.4, 73, 0, 35.4, 92.2, 0);
    lineW(ctx, 38.6, 73, 0, 38.6, 92.2, 0);
    ctx.stroke();
    // at night, light from the windows falls on the ground in front of the lit facades
    if (pal.night) windowSpill(ctx, litFaces);
  };
  return ground;
}
