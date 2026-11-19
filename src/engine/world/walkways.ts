// The walkway graph people wander: see docs/simulation.md for how crossings and portals work.

import type { WalkGraph } from '../people/crowd';
import type { Outskirts } from './outskirts';
import type { RoadZones } from './roads';
import { POCKET_PATH } from './streetLife';

/** The walkway graph: both pavements of the avenue and the street, the crossings, the plaza, the parks and the doors. */
export function walkways(g: WalkGraph, z: RoadZones, outskirts: Outskirts) {
  const { CW1, CW3, CW4, CW5, YE, YG, LD, LE } = z;
  const aw = [g.node(66.5, -50, true), g.node(66.5, 4), g.node(66.5, 34.5), g.node(66.5, 40.5), g.node(66.5, 51.5), g.node(66.5, 66), g.node(66.5, 81.5), g.node(66.5, 96), g.node(66.5, 112, true)];
  const awExit = g.node(66.5, 29.8);
  // either side of the yard gate
  const gate = [g.node(66.5, -18.6), g.node(66.5, -3.4)];
  g.link(aw[0], gate[0]);
  g.link(gate[0], gate[1], YG);
  g.link(gate[1], aw[1]);
  g.link(aw[1], awExit, YE);
  g.chain([awExit, aw[2], aw[3]]);
  g.chain(aw.slice(4));
  // east side of the avenue; round the robotaxi bay, clear of the taper the cars pull in through and of the van's
  // nose swinging out as it turns in
  const ae = [g.node(77.5, -50, true), g.node(77.5, 34.5), g.node(77.5, 40.5), g.node(77.5, 51.5), g.node(80.6, 55.5), g.node(81.0, 68, false, 0.4), g.node(80.6, 75.2, false, 0.4), g.node(77.8, 78.2), g.node(77.5, 81.5), g.node(77.5, 100, true)];
  // either side of the charging hub's driveway
  const hubSides = [g.node(77.8, 6.8, false, 0.5), g.node(77.8, 17.4, false, 0.5)];
  g.chain([ae[0], hubSides[0]]);
  g.link(hubSides[0], hubSides[1], outskirts.hubCrossing);
  g.chain([hubSides[1], ae[1], ae[2]]);
  g.chain(ae.slice(3));
  g.link(aw[2], ae[1], CW3);
  g.link(aw[6], ae[8], CW4);
  const sn = [g.node(42.5, 54), g.node(44.31, 47.25), g.node(49.25, 42.31), g.node(52.5, 41.1), g.node(56, 40.5), g.node(61, 40.5)];
  g.chain(sn);
  g.link(sn[5], aw[3]);
  const sne = [g.node(86.5, 40.5), g.node(104, 40.5), g.node(130, 40.5, true)];
  g.link(ae[2], sne[0]);
  g.chain(sne);
  // round the inside corner of the bend a step back from the kerb, clear of where the bay truck's trailer cuts
  // across it, then single file over the charging lot's entrance, between the trailer's sweep and a car waiting
  // inside the entrance
  const ss0 = g.node(55.2, 54.3);
  const le = [g.node(57.9, 52.3, false, 0.25), g.node(63.4, 52.2, false, 0.25)];
  g.link(ss0, le[0]);
  g.link(le[0], le[1], LE);
  g.link(le[1], aw[4]);
  const sse = [g.node(86.5, 51.5), g.node(90.5, 51.5), g.node(104, 51.5), g.node(125, 51.5, true)];
  g.link(ae[3], sse[0]);
  g.chain(sse);
  g.link(sne[0], sse[0], CW5);
  const fw1 = g.node(42.5, 64.5);
  g.link(sn[0], fw1);
  // down the factory road past the charging lot's way out
  const fd = g.node(53.5, 57.6, false, 0.5);
  const fe = [ss0, g.node(53.5, 64.5, false, 0.5), g.node(53.5, 83.5), g.node(53.5, 126, true)];
  g.link(ss0, fd);
  g.link(fd, fe[1], LD);
  g.chain(fe.slice(1));
  g.link(fw1, fe[1], CW1);
  // the factory's door, set back in its entrance recess (`ENTRANCE` in buildings.ts)
  const door = g.node(24.9, 58.0, true, 0.5);
  const p = [g.node(29.2, 58.6), g.node(36, 61.2), g.node(41.2, 61.6), g.node(29.0, 50.0), g.node(41, 50.2)];

  g.chain([door, p[0], p[1]]);
  g.link(p[1], p[2]);
  g.link(p[2], fw1);
  g.link(p[0], p[3]);
  // the path through the pocket park, from the plaza walk to the street corner
  const pp = POCKET_PATH.map(([x, y], i) => (i === 0 ? g.node(36.2, 50.1) : g.node(x, y)));
  g.chain([p[3], pp[0], p[4]]);
  g.chain(pp);
  g.link(pp[3], sn[2]);
  g.link(p[4], sn[1]);
  // the front door of the house on the corner
  // round the plaza hedge to the front door of the house beside the bay
  const houseWalk = [p[0], g.node(28.1, 66.2), g.node(29.9, 73.6), g.node(29.9, 80.4, true)];
  g.chain(houseWalk);
  // the car park's and the staff park's walks
  outskirts.walks(g, houseWalk[2], sne[1]);
  const pd = g.node(88.6, 38.8, true);
  g.link(pd, sne[0]);
  // round the west side of the house and along its garden
  const pk = [g.node(85.2, 54.0), g.node(85.2, 65.0), g.node(112, 65.6, true)];
  g.link(sse[0], pk[0]);
  g.link(pk[0], pk[1]);
  g.link(pk[1], pk[2]);
  g.link(pk[1], ae[5]);
}
