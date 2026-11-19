// The buildings: the factory and its dock wing, the battery yard by the docks, the pavilion, the robotaxi shelter,
// the home beside the loading bay, and the construction site.

import { C } from '../core';
import { boxShadow, rectShadow } from '../ground';
import { box, onFaceX, onFaceY } from '../draw';
import { drawMesh } from '../mesh';
import { megapacks } from '../blocks';
import { atrium, solarRoof, windowGlow, windowsX, windowsY, type Band } from '../details';
import { BoxItem, FnItem } from '../statics';
import { MESH } from '../traffic/meshes';
import { charger } from './chargers';
import { Crane } from '../activities/crane';
import { Looper } from '../activities/looper';
import type { TruckYard } from '../activities/truckYard';
import type { Activity, Env } from '../activities/activity';

/**
 * The factory and its dock wing: two loading docks and the charging bay (a lamp by each shows the yard's state), the
 * bay's chargers and battery bank on a kerbed island the semis can't drive over, and pallets by the wall.
 */
export function factory(env: Env, edge: string, yard: TruckYard) {
  const { pal, statics: S } = env;
  const factoryBandsX: Band[] = [
    { top: 1.2, bot: 3.8, every: 1.5 },
    { top: 5.2, bot: 7.8, every: 1.5 },
    { top: 9.2, bot: 12.7, every: 1.5, spans: [[0.5, 11.2], [16.8, 35.5]] },
    { top: 9.6, bot: 12.95, every: 1.1, spans: [[11.6, 16.4]], dark: true },
  ];
  const factoryBandsY: Band[] = [
    { top: 1.2, bot: 3.8, every: 1.5, spans: [[0.5, 65.5]] },
    { top: 5.2, bot: 7.8, every: 1.5, spans: [[0.5, 65.5]] },
    { top: 9.2, bot: 12.7, every: 1.5, spans: [[0.5, 65.5]] },
  ];
  S.push(
    new BoxItem(-40, 36, 0, 26, 72, 13, pal.factory, { edge }, (r) => {
      windowsX(r, pal, 26, 36, 72, 13, factoryBandsX);
      windowsY(r, pal, -40, 26, 72, 13, factoryBandsY);
      solarRoof(r, pal, -40, 36, 26, 72, 13, 1.2, 2.6);
    }),
  );
  // entrance canopy and its posts
  S.push(new BoxItem(26, 53.6, 4.05, 30.6, 62.4, 4.35, pal.white, { edge }));
  S.push(new BoxItem(30.1, 53.9, 0, 30.35, 54.15, 4.05, pal.white));
  S.push(new BoxItem(30.1, 61.85, 0, 30.35, 62.1, 4.05, pal.white));

  // dock wing with roll-up doors and a tall atrium window above the compute platform
  const dockDoors = [...yard.docks.map((d) => d.y), yard.bay.y];
  S.push(
    new BoxItem(-30, 0, 0, 30, 36, 10, pal.factory, { edge }, (r) => {
      onFaceX(r, 30, 0, 36, 10, (ctx) => {
        for (const y of dockDoors) {
          const u = 36 - y;
          ctx.fillStyle = pal.dockDoor;
          ctx.fillRect(u - 1.65, 6.0, 3.3, 3.98);
          ctx.strokeStyle = pal.night ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.16)';
          ctx.lineWidth = 0.05;
          ctx.beginPath();
          for (let v = 6.3; v < 9.9; v += 0.32) {
            ctx.moveTo(u - 1.6, v);
            ctx.lineTo(u + 1.6, v);
          }
          ctx.stroke();
        }
      });
      windowsX(r, pal, 30, 0, 36, 10, [{ top: 1.4, bot: 3.0, every: 1.2, spans: [[10.4, 35.6]] }]);
      atrium(r, pal, 30, 0, 36, 10, 0.6, 9.4, 1.4, 9.7);
      solarRoof(r, pal, -30, 0, 30, 36, 10, 1.0, 2.6);
    }).live((r) => {
      // a lamp beside each dock: green while a trailer is loading (or charging, at the bay), amber while one is coming
      // or going, off when free
      onFaceX(r, 30, 0, 36, 10, (ctx) => {
        for (const y of dockDoors) {
          const d = [...yard.docks, yard.bay].find((k) => k.y === y);
          const loading = d ? d.loading : true;
          const busy = d ? d.taken : true;
          const pulse = loading && d ? 0.65 + 0.35 * Math.sin(r.t * 3 + y) : 1;
          ctx.fillStyle = loading ? pal.led : busy ? pal.ledWarm : pal.night ? '#2a2c33' : '#c3c4cc';
          ctx.globalAlpha = pulse;
          ctx.fillRect(36 - y + 2.05, 5.15, 0.34, 0.24);
          ctx.globalAlpha = 1;
        }
      });
    }),
  );
  // a charger beside every spot a semi parks, each on a kerbed island just outside the semis' sweep (measured: the
  // gap beside the second dock is the tightest), and the battery bank that feeds them where the fourth dock used to
  // be. The kerbs are drawn with the ground (CHARGER_ISLANDS).
  megapacks(S, pal, edge, [[31.4, 37.2], [38.0, 43.8]], [21.0, 23.4], 7);
  for (const [spot, py] of [[yard.docks[0], 6.9], [yard.docks[1], 12.55], [yard.bay, 19.4]] as const) {
    S.push(charger(pal, 45.8, py, [46.7, spot.y + 1.3, 1.1], spot));
  }
  // pallets in the gaps between docks, by the wall
  for (const [x, y, n] of [[33.4, 13.5, 2], [36.6, 7.5, 1], [32.2, 1.0, 1]] as const) {
    S.push(
      new FnItem(x - 0.6, y - 0.6, 0, x + 0.6, y + 0.6, n * 0.95, (r) => {
        for (let i = 0; i < n; i++) drawMesh(r, MESH.crate, x, y, i * 0.95, 1, 0, [pal.crate, pal.carGlass, pal.concrete.right]);
      }, (ctx) => boxShadow(ctx, x - 0.55, y - 0.55, x + 0.55, y + 0.55, n * 0.95)).still(),
    );
  }
}
/** The battery yard by the docks, the pavilion, the robotaxi shelter and the home beside the loading bay. */
export function buildings(env: Env, edge: string) {
  const { pal, statics: S } = env;
  // ------------------------------------------------------------------------------------------------- battery yard
  // north of the docks with a clear apron in front of every one of them, and clear of the yard lane
  megapacks(S, pal, edge, [[44.4, 50.2], [51.8, 57.6]], [-6.4, -9.2, -12, -14.8, -17.6, -20.4, -23.2]);
  S.push(
    new BoxItem(62.2, 0.4, 0, 64.8, 2.8, 2.1, pal.factory, { edge }, (r) => {
      onFaceY(r, 62.2, 64.8, 2.8, 2.1, (ctx, w) => {
        ctx.strokeStyle = pal.night ? 'rgba(0,0,0,0.3)' : 'rgba(90,92,104,0.25)';
        ctx.lineWidth = 0.08;
        ctx.beginPath();
        for (let u = 0.3; u < w; u += 0.3) {
          ctx.moveTo(u, 0.2);
          ctx.lineTo(u, 1.9);
        }
        ctx.stroke();
      });
    }),
  );

  // ------------------------------------------------------------------------------------------------- pavilion
  S.push(
    new BoxItem(80, 26, 0, 97, 38, 3.6, pal.white, { edge }, (r) => {
      windowsY(r, pal, 80, 97, 38, 3.6, [{ top: 0.4, bot: 3.45, every: 1.5, spans: [[0.4, 7.8], [9.6, 16.6]] }, { top: 0.6, bot: 3.55, every: 0.9, spans: [[7.9, 9.5]], dark: true }]);
      windowsX(r, pal, 97, 26, 38, 3.6, [{ top: 0.4, bot: 3.45, every: 1.5, spans: [[0.4, 11.6]] }]);
    }),
  );
  S.push(
    new BoxItem(86, 24.5, 3.6, 97, 38, 7.4, pal.white, { edge }, (r) => {
      onFaceY(r, 86, 97, 38, 7.4, (ctx, w) => {
        const [c0, c1] = r.night ? pal.windowNight : pal.window;
        const g = ctx.createLinearGradient(0, 0.4, 0, 3.6);
        g.addColorStop(0, c0);
        g.addColorStop(1, c1);
        ctx.fillStyle = g;
        ctx.fillRect(0.4, 0.4, w - 0.8, 3.2);
        windowGlow(r, ctx, w, [{ top: 0.4, bot: 3.6, spans: [[0.4, w - 0.4]] }]);
        // vertical fins
        for (let u = 0.6; u < w - 0.4; u += 0.42) {
          ctx.fillStyle = pal.white.left;
          ctx.fillRect(u, 0.3, 0.16, 3.4);
          ctx.fillStyle = pal.white.right;
          ctx.fillRect(u + 0.16, 0.3, 0.05, 3.4);
        }
      });
    }),
  );
  S.push(new BoxItem(79.4, 25.4, 3.6, 86, 38.7, 3.95, pal.white, { edge }));
  S.push(new BoxItem(79.55, 38.3, 0, 79.8, 38.55, 3.6, pal.white));

  // ------------------------------------------------------------------------------------------------- robotaxi shelter
  S.push(new BoxItem(84.2, 60.0, 0, 84.45, 66.0, 2.5, pal.white, { edge }));
  S.push(new BoxItem(83.25, 60.6, 0, 83.95, 65.4, 0.46, pal.white, { edge }));
  S.push(new BoxItem(82.0, 59.8, 2.5, 84.7, 66.2, 2.72, pal.white, { edge }));

  // ------------------------------------------------------------------------------------------------- home: solar roof, batteries, carport charging
  // on the left, between the factory corner and the loading bay
  S.push(
    new BoxItem(20.4, 75.6, 0, 28.8, 84.2, 3.2, pal.white, { edge }, (r) => {
      windowsY(r, pal, 20.4, 28.8, 84.2, 3.2, [{ top: 0.3, bot: 3.05, every: 1.6, spans: [[0.4, 8.0]] }]);
      windowsX(r, pal, 28.8, 75.6, 84.2, 3.2, [{ top: 0.35, bot: 2.95, every: 1.5, spans: [[5.2, 8.2]] }, { top: 0.7, bot: 3.2, every: 1, spans: [[3.3, 4.3]], dark: true }]);
    }),
  );
  S.push(
    new BoxItem(20, 75.2, 3.2, 29.3, 84.6, 6.3, pal.white, { edge }, (r) => {
      windowsY(r, pal, 20, 29.3, 84.6, 6.3, [{ top: 0.65, bot: 2.25, every: 1.25, spans: [[0.6, 5.8]] }]);
      windowsX(r, pal, 29.3, 75.2, 84.6, 6.3, [{ top: 0.65, bot: 2.25, every: 1.25, spans: [[0.8, 3.8], [5.6, 8.6]] }]);
      solarRoof(r, pal, 20, 75.2, 29.3, 84.6, 6.3, 0.45);
    }),
  );
  // home batteries on the wall facing the bay
  for (const y of [81.6, 82.75]) {
    S.push(
      new BoxItem(28.8, y, 0.15, 29.18, y + 0.95, 1.95, pal.bright, { edge }).live((r) => {
        const p = 0.5 + 0.5 * Math.sin(r.t * 1.4 + y);
        const ctx = r.ctx;
        ctx.globalAlpha = 0.4 + 0.6 * p;
        ctx.fillStyle = pal.led;
        const X = (29.18 - (y + 0.48)) * C, Y = (29.18 + y + 0.48) * 0.5 - 1.55;
        ctx.fillRect(X - 0.04, Y - 0.12, 0.08, 0.24);
        ctx.globalAlpha = 1;
      }),
    );
  }
  // carport with a solar roof, the car on its charger
  S.push(new BoxItem(21, 85.4, 2.6, 28.6, 89.6, 2.85, pal.white, { edge }, (r) => solarRoof(r, pal, 21, 85.4, 28.6, 89.6, 2.85, 0.35)));
  for (const [x, y] of [[21.15, 85.55], [28.2, 85.55], [21.15, 89.2], [28.2, 89.2]]) S.push(new BoxItem(x, y, 0, x + 0.25, y + 0.25, 2.6, pal.white));
  S.push(
    new FnItem(21.35, 88.25, 0, 21.75, 88.65, 1.3, (r) => {
      box(r, 21.38, 88.28, 0, 21.72, 88.62, 1.25, pal.bright, { edge });
      const p = 0.5 + 0.5 * Math.sin(r.t * 2.2);
      const ctx = r.ctx;
      ctx.globalAlpha = 0.45 + 0.55 * p;
      ctx.fillStyle = pal.led;
      const X = (21.72 - 88.45) * C, Y = (21.72 + 88.45) * 0.5 - 0.95;
      ctx.fillRect(X - 0.04, Y - 0.1, 0.08, 0.2);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = pal.night ? '#0c0c0e' : '#3b3d44';
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      const ex = (22.5 - 88.2) * C, ey = (22.5 + 88.2) * 0.5 - 0.7;
      ctx.moveTo(X, Y + 0.15);
      ctx.quadraticCurveTo((X + ex) / 2, Y + 0.6, ex, ey);
      ctx.stroke();
    }),
  );
  {
    const mats = [pal.paints[4], pal.carGlass, pal.tyre, pal.headlight, pal.taillight];
    S.push(new FnItem(22.2, 86.5, 0, 27.0, 88.5, 1.65, (r) => drawMesh(r, MESH.suv, 24.6, 87.5, 0, -1, 0, mats), (ctx) => rectShadow(ctx, 24.6, 87.5, -1, 0, 2.3, 0.95, 1.2)).still());
  }
}
/** The construction site: a steel frame on a slab, a stair tower, the pickup, the crane and the workers. */
export function constructionSite(env: Env, edge: string, acts: Activity[]) {
  const { pal, statics: S } = env;
  const cols = [56, 59.75, 63.5];
  const rows = [87, 91.33, 95.67, 100];
  for (const x of cols) for (const y of rows) {
    S.push(new BoxItem(x - 0.16, y - 0.16, 0, x + 0.16, y + 0.16, 3.4, pal.steel));
    S.push(new BoxItem(x - 0.16, y - 0.16, 3.6, x + 0.16, y + 0.16, 6.85, pal.steel));
  }
  S.push(new BoxItem(55.7, 86.7, 3.4, 63.8, 96.0, 3.6, pal.concrete, { edge }));
  for (const y of rows) S.push(new BoxItem(55.84, y - 0.13, 7.05, 63.66, y + 0.13, 7.25, pal.steel, undefined, undefined, false));
  for (const x of cols) S.push(new BoxItem(x - 0.13, 86.84, 6.85, x + 0.13, 100.16, 7.05, pal.steel, undefined, undefined, false));
  S.push(new BoxItem(55.84, 99.87, 3.4, 63.66, 100.13, 3.6, pal.steel));
  // stair tower
  S.push(new BoxItem(64.3, 88.0, 0, 65.4, 90.6, 3.6, pal.white, { edge }, (r) => {
    onFaceX(r, 65.4, 88.0, 90.6, 3.6, (ctx, w) => {
      ctx.strokeStyle = pal.night ? 'rgba(0,0,0,0.4)' : 'rgba(100,102,114,0.45)';
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      for (let v = 0.4; v < 3.6; v += 0.9) {
        ctx.moveTo(0.1, v + 0.9);
        ctx.lineTo(w - 0.1, v);
      }
      ctx.stroke();
    });
  }));
  // the pickup parked by the site
  {
    const mats = [pal.steel, pal.carGlass, pal.tyre, pal.headlight, pal.taillight];
    S.push(new FnItem(57.6, 81.9, 0, 63.4, 84.1, 2, (r) => drawMesh(r, MESH.pickup, 60.5, 83.0, 0, -1, 0, mats), (ctx) => rectShadow(ctx, 60.5, 83, -1, 0, 2.8, 1.0, 1.4)).still());
  }
  acts.push(new Crane(env));
  // workers: robots and people in hi-vis on the slab and by the pile
  acts.push(new Looper(env, 'robot', () => [{ x: 57.6, y: 88.6, z: 3.6, wait: 2 }, { x: 61.8, y: 94.2, z: 3.6, wait: 2.5 }], 57.6, 88.6, 3.6));
  acts.push(new Looper(env, 'person', () => [{ x: 61.6, y: 88.4, z: 3.6, wait: 3 }, { x: 58.2, y: 92.8, z: 3.6, wait: 2 }], 61.6, 88.4, 3.6, true));
  acts.push(new Looper(env, 'robot', () => [{ x: 58.8, y: 92.4, z: 3.6, wait: 4 }, { x: 59.6, y: 91.6, z: 3.6, wait: 4 }], 58.8, 92.4, 3.6));
  acts.push(new Looper(env, 'person', () => [{ x: 57.4, y: 87.9, wait: 4 }, { x: 58.9, y: 88.3, wait: 3 }], 57.4, 87.9, 0, true));
}
