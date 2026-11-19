// Builds site-dist/: the demo website GitHub Pages serves (site/, a small React app using the library from src/).
// The social preview image comes from docs/, and .nojekyll keeps Pages from touching the files.
import { execFileSync } from 'node:child_process';
import { copyFileSync, writeFileSync } from 'node:fs';

const env = { ...process.env };
// the Pages workflow passes the real address; Vite reads VITE_SITE_URL into index.html's meta tags
if (env.SITE_URL) env.VITE_SITE_URL = env.SITE_URL.replace(/\/?$/, '/');
execFileSync('npx', ['vite', 'build', '--mode', 'site', '--logLevel', 'warn'], { stdio: 'inherit', env });
copyFileSync('docs/preview-light.jpg', 'site-dist/preview.jpg');
writeFileSync('site-dist/.nojekyll', '');
console.log('site-dist/ ready');
