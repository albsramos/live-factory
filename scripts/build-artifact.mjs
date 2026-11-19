// Builds artifact-dist/live-factory.html: the demo website as one self-contained file (scripts and styles inlined),
// for publishing as a Claude artifact. It is the same page as the GitHub Pages site.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

execFileSync('node', ['scripts/build-site.mjs'], { stdio: 'inherit' });
const html = readFileSync('site-dist/index.html', 'utf8');
const asset = (href) => readFileSync(join('site-dist', href.replace(/^\.\//, '')), 'utf8');

let page = html
  // stylesheets the build emitted, inlined
  .replace(/<link rel="stylesheet"[^>]*href="(\.\/assets\/[^"]+\.css)"[^>]*>/g, (_, href) => `<style>${asset(href)}</style>`)
  // the module script, inlined (closing tags inside it escaped)
  .replace(/<script type="module" crossorigin src="(\.\/assets\/[^"]+\.js)"><\/script>/g, (_, src) => '')
  .replace(/<link rel="modulepreload"[^>]*>/g, '');
const js = readdirSync('site-dist/assets').filter((f) => f.endsWith('.js')).map((f) => asset(`assets/${f}`)).join('\n');
page = page.replace('</body>', () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>\n</body>`);
// the artifact host supplies the document skeleton: keep the head's contents and the body's
const head = page.slice(page.indexOf('<head>') + 6, page.indexOf('</head>')).replace(/<meta charset[^>]*>\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '');
const body = page.slice(page.indexOf('<body>') + 6, page.indexOf('</body>'));
mkdirSync('artifact-dist', { recursive: true });
writeFileSync('artifact-dist/live-factory.html', `${head.trim()}\n${body.trim()}\n`);
console.log(`artifact-dist/live-factory.html  ${(Buffer.byteLength(head + body) / 1024).toFixed(0)} kB`);
