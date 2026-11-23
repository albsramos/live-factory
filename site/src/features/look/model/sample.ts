// Sample figures for the possible-look page. Nothing here is measured: the page shows how widgets would sit under
// the scene, and says so.

export interface Kpi {
  label: string;
  value: string;
  unit: string;
  delta: string;
  tone: 'good' | 'warn' | 'flat';
  /** twelve bars, 0–100, the last one highlighted */
  spark: readonly number[];
}

export const KPIS: readonly Kpi[] = [
  { label: 'Vehicles built', value: '1,284', unit: 'today', delta: '+6.2%', tone: 'good', spark: [40, 52, 48, 60, 58, 66, 70, 64, 72, 78, 74, 86] },
  { label: 'Solar on the roofs', value: '38.4', unit: 'MWh', delta: '+12%', tone: 'good', spark: [10, 22, 38, 55, 70, 82, 90, 88, 76, 60, 41, 25] },
  { label: 'Robots working', value: '212', unit: 'of 240', delta: '88%', tone: 'flat', spark: [80, 84, 82, 86, 88, 85, 90, 87, 89, 86, 88, 88] },
  { label: 'Trucks dispatched', value: '46', unit: 'today', delta: '−3', tone: 'warn', spark: [30, 45, 50, 38, 60, 55, 48, 62, 58, 52, 44, 40] },
];

/** vehicles off the line per hour, built against plan, as a share of the busiest hour */
export const HOURS: readonly { hour: string; built: number; plan: number }[] = [
  ['06', 52, 60], ['07', 64, 70], ['08', 78, 80], ['09', 86, 85], ['10', 92, 88], ['11', 88, 88],
  ['12', 70, 75], ['13', 84, 85], ['14', 90, 88], ['15', 94, 90], ['16', 80, 82], ['17', 60, 65],
].map(([hour, built, plan]) => ({ hour: hour as string, built: built as number, plan: plan as number }));

export const ON_SITE: readonly { label: string; count: number; kind: 'cars' | 'people' | 'robots' | 'trucks' | 'packs' }[] = [
  { label: 'Cars on the roads', count: 26, kind: 'cars' },
  { label: 'People on the walkways', count: 41, kind: 'people' },
  { label: 'Robots at the docks', count: 9, kind: 'robots' },
  { label: 'Trucks loading', count: 2, kind: 'trucks' },
  { label: 'Megapacks charging', count: 24, kind: 'packs' },
];
