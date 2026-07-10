import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Mirrors the tsconfig "@/*" path alias so tests can exercise modules that
// import app code via "@/..." (e.g. lib/seo.ts). No other config — tests are
// plain node-environment unit tests.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
