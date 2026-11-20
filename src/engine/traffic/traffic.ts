// The traffic model: every vehicle and zone in the scene, updated, drawn and lit together. Lanes are paths,
// intersections and crosswalks are zones, and every vehicle brakes for whatever is in front of it.

import type { Mat } from '../core';
import type { Ctx } from '../draw';
import { drawRoadLight } from '../lights';
import type { Palette } from '../palette';
import type { Item } from '../sort';
import { paintFor } from './paints';
import { type Compat, Zone, sameKind } from './zone';
import type { VehicleKind } from './meshes';
import type { Leg } from './legs';
import { Vehicle } from './vehicle';
import type { VehicleItem } from './vehicleItem';

export class Traffic {
  readonly vehicles: Vehicle[] = [];
  readonly zones: Zone[] = [];
  constructor(readonly pal: Palette) {}

  zone(x0: number, y0: number, x1: number, y1: number, compat: Compat) {
    const z = new Zone(x0, y0, x1, y1, compat);
    if (compat === sameKind) z.yieldKey = 'ped';
    this.zones.push(z);
    return z;
  }

  /** `role` tags vehicles that zones treat specially (see `Zone.keyOf`). The paint keeps to the kind's colours (`paintFor`). */
  add(kind: VehicleKind, paint: Mat, legs: Leg[], role = '') {
    const v = new Vehicle(kind, this.pal, paintFor(this.pal, kind, paint), legs, this, role);
    this.vehicles.push(v);
    return v;
  }

  /** True if nothing is within `r` of (x, y). */
  clear(x: number, y: number, r: number) {
    for (const v of this.vehicles) for (const b of v.bodies) if (Math.hypot(b.x - x, b.y - y) < r + b.hl) return false;
    return true;
  }

  update(dt: number) {
    for (const z of this.zones) z.tick(dt);
    for (const v of this.vehicles) v.update(dt);
    for (let i = this.vehicles.length - 1; i >= 0; i--) if (this.vehicles[i].dead) this.vehicles.splice(i, 1);
  }

  items(out: Item[]) {
    for (const v of this.vehicles) for (const it of v.items) {
      (it as VehicleItem).bounds();
      out.push(it);
    }
  }

  shadows(ctx: Ctx) {
    for (const v of this.vehicles) v.shadow(ctx);
  }

  /** Headlight beams and tail glow on the road (night only), drawn before the vehicles themselves. */
  lights(ctx: Ctx) {
    drawRoadLight(ctx, this.vehicles.filter((v) => v.isLit && v.z < 0.3));
  }
}
