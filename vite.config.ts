import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * The library's CSS (the component's CSS module) goes into the JS bundle and is added to the page on load, once, so
 * an app using the package doesn't have to import a stylesheet. Inserted before the source map comment, so the map
 * still lines up.
 */
function injectCss(): Plugin {
  return {
    name: 'live-factory:inject-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      let css = '';
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === 'asset' && name.endsWith('.css')) {
          css += String(file.source).replace(/\/\*\$vite\$:\d+\*\/\n?/g, '');
          delete bundle[name];
        }
      }
      if (!css) return;
      const inject =
        `if (typeof document !== 'undefined' && !document.getElementById('live-factory-css')) {` +
        ` const s = document.createElement('style'); s.id = 'live-factory-css'; s.textContent = ${JSON.stringify(css)};` +
        ` document.head.appendChild(s); }\n`;
      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk' || !file.isEntry) continue;
        const at = file.code.lastIndexOf('//# sourceMappingURL=');
        file.code = at < 0 ? file.code + inject : file.code.slice(0, at) + inject + file.code.slice(at);
      }
    },
  };
}

// Three builds from one config:
//   `vite`                 the demo website (site/), what GitHub Pages serves; `vite build --mode site` builds it
//   `vite --mode lab`      the development lab (demo/): every vehicle at eight headings (?gallery), and the bare
//                          engine exposed as window.scene (?debug) for the simulation checks in scripts/
//   `vite build`           the library itself, into dist/
// The site and the lab import the library as `live-factory`, exactly as an app would.
export default defineConfig(({ command, mode }) => {
  const alias = { 'live-factory': here('./src/index.ts') };
  if (mode === 'lab') {
    return { root: here('./demo'), base: './', plugins: [react()], resolve: { alias } };
  }
  if (command === 'serve' || mode === 'site') {
    return {
      root: here('./site'),
      base: './',
      plugins: [react()],
      resolve: { alias },
      build: { outDir: here('./site-dist'), emptyOutDir: true },
    };
  }
  return {
    plugins: [react(), injectCss()],
    // readable, still unique, class names in the bundled CSS
    css: { modules: { generateScopedName: 'live-factory-[local]-[hash:base64:5]' } },
    build: {
      lib: {
        entry: here('./src/index.ts'),
        formats: ['es', 'cjs'],
        fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'react/jsx-runtime'],
        // the component uses hooks: mark it as a client component for React Server Components (Next.js app router)
        output: { banner: "'use client';" },
      },
      sourcemap: true,
      emptyOutDir: true,
    },
  };
});
