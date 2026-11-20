// Colour themes. "light" follows the reference render: white clay, warm windows, dark solar glass, gold accents.

import { Glaze, Mat, hex, mat, type RGB } from './core';

export interface Palette {
  night: boolean;
  /** counts the theme changes this palette has been through (see `morphPalette`) */
  generation: number;
  bg: string;
  ground: string;
  pad: string;
  plaza: string;
  /** the small park's grass, a breath greener than the plaza */
  lawn: string;
  road: string;
  roadLine: string;
  curbHi: string;
  curbLo: string;
  shadow: string;
  /** tint over the part of an object that a building's shadow falls on */
  faceShadow: string;
  ao: string;
  // solids
  white: Mat;
  bright: Mat;
  factory: Mat;
  factoryDark: Mat;
  concrete: Mat;
  steel: Mat;
  dark: Mat;
  rack: Mat;
  rackFront: string;
  crate: Mat;
  planter: Mat;
  // glass, light
  window: [string, string];
  windowNight: [string, string];
  mullion: string;
  glassDark: string;
  solar: string;
  solarLine: string;
  solarFrame: string;
  dockDoor: string;
  glow: string;
  led: string;
  ledBlue: string;
  ledWarm: string;
  // vehicles
  /** car paints; which of them each kind may wear is in `traffic/paints.ts` */
  paints: Mat[];
  gold: Mat;
  carGlass: Mat;
  tyre: string;
  headlight: string;
  taillight: string;
  /** the roadster's glass: dark with a hint of gold, a little lighter towards the windscreen */
  tintGlass: Glaze;
  /** the roadster's thrusters: the jet's hot core and its colour, and the smoke they raise (lit side, shade) */
  jet: [string, string];
  smoke: [string, string];
  // people & robots
  /** people's clothes: plain greys, so the robots and the cars are what stands out */
  people: RGB[];
  /** dark trim on vehicle meshes */
  robot: string;
  robotHead: string;
  /**
   * the humanoid robots: a white shell (or `botGold`'s champagne one) with a black glass head, waist, hips, joints,
   * hands and feet, and a thin light line round the face
   */
  bot: { shell: string; shade: string; dark: string; glint: string };
  botGold: { shell: string; shade: string };
  // trees
  leafHi: RGB;
  leafLo: RGB;
  trunk: string;
}

export function lightPalette(): Palette {
  return {
    night: false,
    generation: 0,
    bg: '#e9e9ed',
    ground: '#ebebef',
    pad: '#e4e4e9',
    plaza: '#efeff2',
    lawn: '#d5e2cf',
    road: '#dcdce2',
    roadLine: '#f6f6f8',
    curbHi: '#f9f9fb',
    curbLo: '#cfd0d7',
    shadow: 'rgba(84, 86, 104, 0.15)',
    faceShadow: 'rgba(70, 72, 96, 0.17)',
    ao: 'rgba(70, 72, 92, 0.2)',
    white: mat('#fbfbfc'),
    bright: mat('#ffffff', 0.15),
    factory: mat('#d3d3d9', 0.22),
    factoryDark: mat('#b9bac2', 0.24),
    concrete: mat('#e9e9ed'),
    steel: mat('#f2f2f5', 0.2),
    dark: mat('#3b3d44', 0.35),
    rack: mat('#e6e6ea', 0.2),
    rackFront: '#33353c',
    crate: mat('#efe7d8', 0.2),
    planter: mat('#f3f3f6', 0.18),
    // daylight glass: a faded, slightly blue grey, as if it reflected the sky
    window: ['#e3e9f0', '#bcc7d3'],
    windowNight: ['#ffe3a6', '#f0b45c'],
    mullion: 'rgba(96, 108, 126, 0.34)',
    glassDark: '#3a3e4a',
    solar: '#2d3447',
    solarLine: 'rgba(120, 136, 170, 0.35)',
    solarFrame: '#e9e9ee',
    dockDoor: '#5d5f68',
    glow: '#7fe3ff',
    led: '#59e08f',
    ledBlue: '#6ab8ff',
    ledWarm: '#ffc76b',
    paints: [
      mat('#f4f4f6', 0.2), // white
      mat('#f4f4f6', 0.2),
      mat('#c9cad0', 0.24), // silver
      mat('#a7a9b1', 0.26), // grey
      mat('#3d3f46', 0.36), // graphite
      mat('#2b2c31', 0.38), // black
      mat('#d9c7a0', 0.26), // champagne gold
    ],
    gold: mat('#d6c094', 0.28),
    carGlass: mat('#2f323a', 0.32),
    tyre: '#2a2b30',
    headlight: '#ffffff',
    taillight: '#e0605a',
    tintGlass: new Glaze(mat('#38332b', 0.32), 'rgba(18, 14, 8, 0.16)', 'rgba(222, 190, 132, 0.15)', -2.0, 1.3),
    jet: ['#ffffff', 'rgba(120, 196, 255, 0.85)'],
    smoke: ['#fdfdfe', '#c3c6d0'],
    people: [hex('#e2e3e8'), hex('#d3d4da'), hex('#c4c5cc'), hex('#b3b4bc'), hex('#a0a1aa'), hex('#8a8b94')],
    robot: '#2b2c31',
    robotHead: '#17181b',
    bot: { shell: '#f1f2f5', shade: '#c0c3cb', dark: '#1b1c21', glint: 'rgba(255, 255, 255, 0.85)' },
    botGold: { shell: '#d9ccb2', shade: '#ae9f84' },
    leafHi: hex('#ffffff'),
    leafLo: hex('#d3d4dc'),
    trunk: '#a9aab3',
  };
}

export function darkPalette(): Palette {
  return {
    night: true,
    generation: 0,
    bg: '#17181c',
    ground: '#1b1c21',
    pad: '#1f2026',
    plaza: '#1d1e23',
    lawn: '#1e2c22',
    road: '#141519',
    roadLine: '#3a3c44',
    curbHi: '#2c2e35',
    curbLo: '#0e0f12',
    shadow: 'rgba(0, 0, 0, 0.34)',
    faceShadow: 'rgba(0, 0, 0, 0.3)',
    ao: 'rgba(0, 0, 0, 0.45)',
    white: mat('#43454e', 0.36),
    bright: mat('#4e505a', 0.34),
    factory: mat('#363840', 0.36),
    factoryDark: mat('#2c2e35', 0.36),
    concrete: mat('#2a2c32', 0.32),
    steel: mat('#4a4c55', 0.34),
    dark: mat('#202126', 0.35),
    rack: mat('#33353c', 0.32),
    rackFront: '#121317',
    crate: mat('#5b5548', 0.3),
    planter: mat('#30323a', 0.32),
    window: ['#ffe6b2', '#f5b95f'],
    windowNight: ['#ffe6b2', '#f5b95f'],
    mullion: 'rgba(40, 30, 20, 0.45)',
    glassDark: '#101116',
    solar: '#121725',
    solarLine: 'rgba(90, 110, 150, 0.32)',
    solarFrame: '#3a3c44',
    dockDoor: '#121317',
    glow: '#6fdcff',
    led: '#59e08f',
    ledBlue: '#6ab8ff',
    ledWarm: '#ffc76b',
    paints: [
      mat('#7d808a', 0.34),
      mat('#6c6f78', 0.34),
      mat('#555861', 0.36),
      mat('#3e4048', 0.36),
      mat('#2b2c32', 0.38),
      mat('#1f2025', 0.38),
      mat('#9c8a63', 0.34),
    ],
    gold: mat('#a8915f', 0.34),
    carGlass: mat('#14151a', 0.3),
    tyre: '#0b0b0d',
    headlight: '#fff6dc',
    taillight: '#ff5a50',
    tintGlass: new Glaze(mat('#1a1814', 0.3), 'rgba(0, 0, 0, 0.18)', 'rgba(176, 148, 96, 0.11)', -2.0, 1.3),
    jet: ['#effcff', 'rgba(100, 210, 255, 0.8)'],
    smoke: ['#a3a6b1', '#5d606b'],
    people: [hex('#6a6c76'), hex('#61636c'), hex('#575962'), hex('#4c4e57'), hex('#7a7c86'), hex('#444650')],
    robot: '#0f1013',
    robotHead: '#08080a',
    bot: { shell: '#9a9da8', shade: '#6c6f7a', dark: '#0a0a0d', glint: 'rgba(225, 236, 255, 0.85)' },
    botGold: { shell: '#988c74', shade: '#6c6352' },
    leafHi: hex('#4a4d57'),
    leafLo: hex('#2a2c33'),
    trunk: '#3a3c44',
  };
}

/** A parked car's materials: its paint, then glass, tyres and lamps, read from the palette when drawn so they follow the theme. */
export function carMats(pal: Palette, paint: Mat): (Mat | string)[] {
  return [paint, pal.carGlass, pal.tyre, pal.headlight, pal.taillight];
}

/**
 * Turn `into` into `from` in place: its materials, colour lists and values take on the other theme's, so everything
 * that holds them (the world, its vehicles and people) shows the new theme without being rebuilt. The few colours
 * worked out once from the palette (people's clothes, a vehicle's lamps) are redone when `generation` moves on.
 */
export function morphPalette(into: Palette, from: Palette) {
  const g = into.generation;
  const t = into as unknown as Record<string, unknown>, f = from as unknown as Record<string, unknown>;
  for (const k of Object.keys(f)) t[k] = morph(t[k], f[k]);
  into.generation = g + 1;
}

function morph(a: unknown, b: unknown): unknown {
  if (a instanceof Mat && b instanceof Mat) a.copy(b);
  else if (a instanceof Glaze && b instanceof Glaze) a.copy(b);
  else if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) for (let i = 0; i < a.length; i++) a[i] = morph(a[i], b[i]);
  else if (a && b && typeof a === 'object' && typeof b === 'object') {
    const o = a as Record<string, unknown>, p = b as Record<string, unknown>;
    for (const k of Object.keys(p)) o[k] = morph(o[k], p[k]);
  } else return b;
  return a;
}

export type { Mat };
