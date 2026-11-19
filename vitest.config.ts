import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Unit tests sit next to what they test (src/LivingCity/LivingCity.test.tsx) and run in jsdom: `npm test`.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // process CSS, so a test can read a stylesheet (`?raw`) and class names are real
    css: true,
  },
});
