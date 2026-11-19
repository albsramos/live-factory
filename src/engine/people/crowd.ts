// The walkway graph and the crowd that wanders it. Nodes flagged as portals are where newcomers walk in and
// leavers walk out (off screen, or a door); an edge linked to a zone is a crossing.

import { pick, rr, type Rng } from '../core';
import type { Ctx } from '../draw';
import type { Palette } from '../palette';
import type { Item } from '../sort';
import type { Zone } from '../traffic/zone';
import { type WalkerKind, type Step, Walker } from './walker';

interface GNode {
  x: number;
  y: number;
  adj: { to: number; zone?: Zone }[];
  portal: boolean;
  /** how far walkers spread around this node (1 = their usual offset); smaller keeps them to a tight line */
  spread: number;
}

export class WalkGraph {
  readonly nodes: GNode[] = [];
  node(x: number, y: number, portal = false, spread = 1) {
    this.nodes.push({ x, y, adj: [], portal, spread });
    return this.nodes.length - 1;
  }
  link(a: number, b: number, zone?: Zone) {
    this.nodes[a].adj.push({ to: b, zone });
    this.nodes[b].adj.push({ to: a, zone });
  }
  chain(ids: number[], zone?: Zone) {
    for (let i = 1; i < ids.length; i++) this.link(ids[i - 1], ids[i], zone);
  }
  /** Build a chain of new nodes through the given points; returns their ids. */
  line(pts: number[][], portalEnds = false) {
    const ids = pts.map((p, i) => this.node(p[0], p[1], portalEnds && (i === 0 || i === pts.length - 1)));
    this.chain(ids);
    return ids;
  }
  nearest(x: number, y: number) {
    let best = 0, bd = Infinity;
    this.nodes.forEach((n, i) => {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }
}

export class Crowd {
  readonly walkers: Walker[] = [];
  private spawnT = 0;
  targetPeople = 0;
  targetRobots = 0;

  constructor(readonly graph: WalkGraph, readonly pal: Palette, readonly rng: Rng) {}

  add(w: Walker) {
    this.walkers.push(w);
    return w;
  }

  /** A walker that roams the graph, starting at node `n` (or a random spot mid-edge). */
  wanderer(kind: WalkerKind, n?: number) {
    const g = this.graph;
    const rng = this.rng;
    let start = n ?? Math.floor(rng() * g.nodes.length);
    const node = g.nodes[start];
    const w = new Walker(kind, this.pal, rng, node.x, node.y);
    const rad = Math.sqrt(rng()) * 0.75;
    const a = rng() * Math.PI * 2;
    w.ox = Math.cos(a) * rad;
    w.oy = Math.sin(a) * rad;
    w.x += w.ox * node.spread;
    w.y += w.oy * node.spread;
    w.node = start;
    w.hops = n === undefined ? Math.floor(rng() * 6) : 0;
    w.onIdle = (ww) => this.next(ww);
    // begin part-way along an edge so the opening frame isn't clumped on nodes, but never on a crossing: someone
    // placed in the middle of one would stand in the road waiting for their turn to enter it
    const open = node.adj.filter((e) => !e.zone);
    if (n === undefined && open.length) {
      const e = pick(rng, open);
      const to = g.nodes[e.to];
      const f = rng();
      w.x = node.x + w.ox * node.spread + (to.x + w.ox * to.spread - node.x - w.ox * node.spread) * f;
      w.y = node.y + w.oy * node.spread + (to.y + w.oy * to.spread - node.y - w.oy * node.spread) * f;
      w.prev = start;
      w.node = e.to;
      start = e.to;
      w.go([{ x: to.x + w.ox * to.spread, y: to.y + w.oy * to.spread, zone: e.zone }]);
    }
    return this.add(w);
  }

  /** A wanderer who walks in at one of the walkway's ends (off screen, or a door), so nobody appears in view. */
  arrival(kind: WalkerKind) {
    const portals = this.graph.nodes.map((n, i) => (n.portal ? i : -1)).filter((i) => i >= 0);
    return this.wanderer(kind, portals.length ? pick(this.rng, portals) : undefined);
  }

  /** Hand a scripted walker over to the graph once its script is done. */
  adopt(w: Walker) {
    w.node = this.graph.nearest(w.x, w.y);
    w.prev = -1;
    w.hops = 0;
    w.ox = 0;
    w.oy = 0;
    w.onIdle = (ww) => this.next(ww);
    const n = this.graph.nodes[w.node];
    w.go([{ x: n.x, y: n.y }]);
  }

  private next(w: Walker) {
    const g = this.graph;
    const rng = this.rng;
    const cur = g.nodes[w.node];
    if (cur.portal && w.hops >= 3 && rng() < 0.7) {
      w.dead = true;
      return;
    }
    let opts = cur.adj.filter((e) => e.to !== w.prev);
    if (!opts.length) opts = cur.adj;
    if (!opts.length) {
      w.waitT = 3;
      return;
    }
    // crossing the road is less tempting than staying on this side
    let e = pick(rng, opts);
    if (e.zone && opts.some((o) => !o.zone) && rng() < 0.55) e = pick(rng, opts.filter((o) => !o.zone));
    const to = g.nodes[e.to];
    w.prev = w.node;
    w.node = e.to;
    w.hops++;
    const step: Step = { x: to.x + w.ox * to.spread, y: to.y + w.oy * to.spread, zone: e.zone };
    if (rng() < 0.1 && !e.zone) {
      step.wait = rr(rng, 1.5, 5);
      const a = rng() * Math.PI * 2;
      step.face = [Math.cos(a), Math.sin(a)];
    }
    w.go([step]);
  }

  update(dt: number) {
    for (const w of this.walkers) w.update(dt);
    for (let i = this.walkers.length - 1; i >= 0; i--) {
      const w = this.walkers[i];
      if (w.dead) {
        if (w.holding) w.holding.leave(w);
        this.walkers.splice(i, 1);
      }
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = rr(this.rng, 0.4, 1.4);
      let people = 0, robots = 0;
      for (const w of this.walkers) if (w.onIdle) w.kind === 'robot' ? robots++ : people++;
      if (people < this.targetPeople) this.arrival('person');
      else if (robots < this.targetRobots) this.arrival('robot');
    }
  }

  items(out: Item[]) {
    for (const w of this.walkers) {
      if (w.hidden) continue;
      w.bounds();
      out.push(w);
    }
  }

  shadows(ctx: Ctx) {
    for (const w of this.walkers) w.shadow(ctx);
  }
}
