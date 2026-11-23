// Runs the scene's simulation headless and reports what matters after a change to anything that moves:
//   - vehicles touching people (should be 0)
//   - vehicles touching each other inside the world box (should be 0)
//   - how much of the moving traffic stands still, how many truck runs complete, and the longest stall
//   - how often the roadster hops, and how many of its hops set down in view
//   - pop-ins: vehicles or people that appear or vanish inside the world box (frame.ts `WORLD`) rather than off its
//     edges, a building door or the robotaxi bay (should be 0)
//   - how many vehicles and people the classic banner shows on average, to compare busyness after a change
// It starts the dev lab (`vite --mode lab`) itself and drives window.scene from ?debug.
//
// Usage: node scripts/sim-check.mjs [minutes = 20]
// Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium).
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const minutes = Number(process.argv[2] ?? 20);
const server = await createServer({ mode: 'lab', logLevel: 'warn', server: { port: 5390, strictPort: false } });
await server.listen();
const url = server.resolvedUrls.local[0];
// required rather than imported, so a Playwright installed globally is found too
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  page.on('pageerror', (e) => console.log('page error: ' + e.message));
  await page.goto(`${url}?debug&speed=0.0001`);
  await page.waitForFunction(() => window.scene);
  const r = await page.evaluate((secs) => {
    const s = window.scene;
    s.setVisible(false);
    const w = s.world, tr = w.traffic;
    // oriented boxes, shrunk by `m`, and a separating-axis test
    const corners = (b, m) => {
      const lx = b.hx * (b.hl - m), ly = b.hy * (b.hl - m), wx = -b.hy * (b.hw - m), wy = b.hx * (b.hw - m);
      return [[b.x + lx + wx, b.y + ly + wy], [b.x + lx - wx, b.y + ly - wy], [b.x - lx - wx, b.y - ly - wy], [b.x - lx + wx, b.y - ly + wy]];
    };
    const apart = (A, B) => {
      for (const P of [A, B]) for (let i = 0; i < 4; i++) {
        const a = P[i], b = P[(i + 1) % 4], nx = -(b[1] - a[1]), ny = b[0] - a[0];
        let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
        for (const p of A) { const d = p[0] * nx + p[1] * ny; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
        for (const p of B) { const d = p[0] * nx + p[1] * ny; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
        if (a1 < b0 || b1 < a0) return true;
      }
      return false;
    };
    // the world box (frame.ts WORLD) and the classic banner, in screen units
    const inWorld = (x, y) => { const X = (x - y) * 0.866, Y = (x + y) / 2; return X > -150 && X < 150 && Y > -5 && Y < 100; };
    const onBanner = (x, y) => { const X = (x - y) * 0.866, Y = (x + y) / 2; return Math.abs(X) < 104 && Y > 15 && Y < 81; };
    const onScreen = inWorld;
    // where people may appear or vanish in view: building doors (portal nodes inside the world) and the robotaxi bay
    const doors = w.crowd.graph.nodes.filter((n) => n.portal && inWorld(n.x, n.y));
    const mayPop = (x, y) => (x > 74.5 && x < 81 && y > 54 && y < 72) || doors.some((n) => Math.hypot(n.x - x, n.y - y) < 2.5);
    const out = { people: [], crashes: [], stopped: 0, samples: 0, yard: 0, bay: 0, stall: 0, stallAt: '', hops: 0, landed: 0, pops: [], cars: 0, folk: 0, frames: 0 };
    const lastV = new Map(), lastW = new Map();
    for (const v of tr.vehicles) lastV.set(v.id, v);
    for (const p of w.crowd.walkers) lastW.set(p, [p.x, p.y]);
    const hopSeen = new Map();
    const seenPeople = new Map(), seenCrash = new Set(), semis = new Map(), still = new Map();
    for (let i = 0; i < secs * 20; i++) {
      w.update(1 / 20);
      const t = i / 20;
      const vs = tr.vehicles.filter((v) => v.kind !== 'forklift');
      // people inside a vehicle's body (with a little room for their own size); the roadster flying over them isn't
      for (const v of vs) for (const b of v.bodies) for (const p of w.crowd.walkers) {
        if (v.z > 0.5) continue;
        const dx = p.x - b.x, dy = p.y - b.y, a = dx * b.hx + dy * b.hy, c = -dx * b.hy + dy * b.hx;
        if (Math.abs(a) < b.hl + 0.15 && Math.abs(c) < b.hw + 0.15) {
          const k = v.id + ':' + w.crowd.walkers.indexOf(p);
          if (!(t - (seenPeople.get(k) ?? -99) < 3)) out.people.push(`${t.toFixed(0)}s ${v.kind} at ${v.x.toFixed(0)},${v.y.toFixed(0)}, ${p.kind} at ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
          seenPeople.set(k, t);
        }
      }
      // vehicles inside each other
      const now = new Set();
      for (let a = 0; a < vs.length; a++) for (let b = a + 1; b < vs.length; b++) {
        // one flying over the other
        const top = (v) => v.z + (v.kind === 'semi' ? 4.1 : v.h);
        if (vs[a].z > top(vs[b]) || vs[b].z > top(vs[a])) continue;
        let hit = false;
        for (const ba of vs[a].bodies) for (const bb of vs[b].bodies) if (!hit && Math.hypot(ba.x - bb.x, ba.y - bb.y) < ba.hl + bb.hl + 2 && !apart(corners(ba, 0.15), corners(bb, 0.15))) hit = true;
        if (!hit) continue;
        const k = vs[a].id + ':' + vs[b].id;
        now.add(k);
        if (!seenCrash.has(k) && onScreen(vs[a].x, vs[a].y)) out.crashes.push(`${t.toFixed(0)}s ${vs[a].kind} and ${vs[b].kind} at ${vs[a].x.toFixed(0)},${vs[a].y.toFixed(0)}`);
      }
      seenCrash.clear();
      for (const k of now) seenCrash.add(k);
      // pop-ins and pop-outs, and how busy the classic banner is
      const ids = new Set();
      for (const v of tr.vehicles) {
        ids.add(v.id);
        if (!lastV.has(v.id) && inWorld(v.x, v.y)) out.pops.push(`${t.toFixed(0)}s ${v.kind} appeared at ${v.x.toFixed(0)},${v.y.toFixed(0)}`);
        lastV.set(v.id, v);
      }
      for (const [id, v] of lastV) if (!ids.has(id)) {
        if (inWorld(v.x, v.y)) out.pops.push(`${t.toFixed(0)}s ${v.kind} vanished at ${v.x.toFixed(0)},${v.y.toFixed(0)}`);
        lastV.delete(id);
      }
      const here = new Set(w.crowd.walkers);
      for (const p of w.crowd.walkers) {
        if (!lastW.has(p) && inWorld(p.x, p.y) && !mayPop(p.x, p.y)) out.pops.push(`${t.toFixed(0)}s ${p.kind} appeared at ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
        lastW.set(p, [p.x, p.y]);
      }
      for (const [p, [x, y]] of lastW) if (!here.has(p)) {
        if (inWorld(x, y) && !mayPop(x, y)) out.pops.push(`${t.toFixed(0)}s ${p.kind} vanished at ${x.toFixed(1)},${y.toFixed(1)}`);
        lastW.delete(p);
      }
      if (i % 20 === 0) {
        out.frames++;
        out.cars += vs.filter((v) => onBanner(v.x, v.y)).length;
        out.folk += w.crowd.walkers.filter((p) => !p.hidden && onBanner(p.x, p.y)).length;
      }
      // the roadster's hops, and how many of them set down in view
      for (const v of vs) if (v.hop) {
        const was = hopSeen.get(v.id), now = v.hop.phase;
        if (was === 'road' && now === 'lift') out.hops++;
        if (was === 'land' && now === 'boost') out.landed++;
        hopSeen.set(v.id, now);
      }
      // traffic flow and truck runs
      const alive = new Set();
      for (const v of vs) {
        if (v.kind === 'semi') {
          alive.add(v.id);
          // car carriers (the north yard's and the depot's) are neither yard nor bay runs
          if (!semis.has(v.id)) semis.set(v.id, v.role === 'carrier' ? 'carrier' : v.y < 10 && v.x > 60 ? 'yard' : v.y > 100 ? 'bay' : 'seed');
        }
        const isHolding = v.keep || (v.leg && (v.leg.dwell !== undefined || v.leg.until));
        // only traffic inside the world box counts: the long runs to and from its edges would water the share down
        if (!isHolding && inWorld(v.x, v.y)) {
          out.samples++;
          if (v.v < 0.05) {
            out.stopped++;
            const st = (still.get(v.id) ?? 0) + 1 / 20;
            still.set(v.id, st);
            if (st > out.stall) { out.stall = st; out.stallAt = `${v.kind} at ${v.x.toFixed(0)},${v.y.toFixed(0)}`; }
          } else still.delete(v.id);
        }
      }
      for (const [id, role] of semis) if (!alive.has(id)) { if (role === 'yard') out.yard++; if (role === 'bay') out.bay++; semis.delete(id); }
    }
    return out;
  }, minutes * 60);

  const stoppedPct = (100 * r.stopped) / Math.max(1, r.samples);
  console.log(`${minutes} simulated minutes`);
  console.log(`  vehicles touching people   ${r.people.length}${r.people.length ? '\n    ' + r.people.slice(0, 10).join('\n    ') : ''}`);
  console.log(`  vehicle collisions         ${r.crashes.length}${r.crashes.length ? '\n    ' + r.crashes.slice(0, 10).join('\n    ') : ''}`);
  console.log(`  traffic standing still     ${stoppedPct.toFixed(1)}%   (around 20% is normal: lights, crossings, queues)`);
  console.log(`  truck runs                 yard ${r.yard}, loading bay ${r.bay}   (about 7 and 6 per 15 minutes)`);
  console.log(`  longest stall              ${r.stall.toFixed(0)} s, ${r.stallAt || '-'}`);
  console.log(`  roadster hops              ${r.hops}, ${r.landed} set down in view   (one every 30-45 s; most set down)`);
  console.log(`  pop-ins in the world box   ${r.pops.length}${r.pops.length ? '\n    ' + r.pops.slice(0, 10).join('\n    ') : ''}`);
  console.log(`  in the classic banner      ${(r.cars / r.frames).toFixed(1)} vehicles, ${(r.folk / r.frames).toFixed(1)} people on average`);
  const isBad = r.people.length > 0 || r.crashes.length > 0 || r.stall > 180 || stoppedPct > 35 || r.pops.length > 0;
  console.log(isBad ? 'FAIL' : 'OK');
  process.exitCode = isBad ? 1 : 0;
} finally {
  await browser.close();
  await server.close();
}
