import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: { preload: 'src/preload/index.ts' },
      output: {
        format: 'cjs',
        entryFileNames: '[name].cjs',
      },
    },
  },
});
