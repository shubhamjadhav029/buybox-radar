import { defineConfig } from 'tsup';
export default defineConfig({
  entry: { index: 'src/index.ts', seed: 'src/seed/seed.ts' },
  format: ['cjs'],
  target: 'node20',
  noExternal: ['@radar/shared'],
  sourcemap: true,
  clean: true,
});
