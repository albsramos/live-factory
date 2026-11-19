import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

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
    plugins: [react()],
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
