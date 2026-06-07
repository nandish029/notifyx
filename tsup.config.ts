import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/sw.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  outDir: 'dist',
});
