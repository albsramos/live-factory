// Builds site-dist/: the demo page as a standalone website (what GitHub Pages serves).
// It is the artifact page with React bundled in rather than loaded from a CDN, wrapped in a full HTML document,
// plus a favicon and a social preview image.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const SITE_URL = (process.env.SITE_URL || 'https://albsramos.github.io/live-factory/').replace(/\/?$/, '/');
const DESCRIPTION =
  'A self-running isometric factory town for React: semis back into the docks, robotaxis swap passengers, cars charge and humanoid robots walk around. One canvas, no text.';

rmSync('site-dist', { recursive: true, force: true });
execFileSync('npx', ['vite', 'build', '--config', 'vite.site.config.ts', '--logLevel', 'warn'], { stdio: 'inherit' });
const bundle = readFileSync('site-dist/.bundle/site.iife.js', 'utf8').replace(/<\/script/gi, '<\\/script');
rmSync('site-dist/.bundle', { recursive: true, force: true });

let page = readFileSync('artifact/page.html', 'utf8').replace(/<meta name="claude:[^>]*>\s*/g, '');
const cdn = /<script src="https:\/\/cdnjs\.cloudflare\.com\/[^"]*"><\/script>\s*/g;
if ((page.match(cdn) || []).length !== 2) throw new Error('expected the React and ReactDOM CDN scripts in artifact/page.html');
if (!page.includes('/*BUNDLE*/')) throw new Error('artifact/page.html has no /*BUNDLE*/ marker');
page = page.replace(cdn, '').replace('/*BUNDLE*/', () => bundle);
const split = page.indexOf('<main');
if (split < 0) throw new Error('artifact page has no <main>');
const head = page.slice(0, split).trim();
const body = page.slice(split).trim();

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${DESCRIPTION}">
<meta name="theme-color" content="#f3f3f5" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#111216" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:title" content="Live Factory">
<meta property="og:description" content="${DESCRIPTION}">
<meta property="og:url" content="${SITE_URL}">
<meta property="og:image" content="${SITE_URL}preview.jpg">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="688">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${SITE_URL}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
${head}
</head>
<body>
${body}
</body>
</html>
`;

// a white clay block with a solar roof, lit from the upper left like the scene
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<path d="M16 3 29 10.5 16 18 3 10.5Z" fill="#2d3447"/>
<path d="M3 10.5 16 18v11L3 21.5Z" fill="#f4f4f6"/>
<path d="M29 10.5 16 18v11l13-7.5Z" fill="#c9cad0"/>
<path d="M6 17.2 13 21.2v2.6l-7-4Z" fill="#e8c58e"/>
</svg>
`;

mkdirSync('site-dist', { recursive: true });
writeFileSync('site-dist/index.html', html);
writeFileSync('site-dist/favicon.svg', favicon);
writeFileSync('site-dist/.nojekyll', '');
copyFileSync('docs/preview-light.jpg', 'site-dist/preview.jpg');
console.log(`site-dist/index.html  ${(Buffer.byteLength(html) / 1024).toFixed(0)} kB  (${SITE_URL})`);
