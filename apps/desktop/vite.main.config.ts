import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: { main: 'src/main/index.ts' },
      output: {
        format: 'cjs',
        entryFileNames: '[name].cjs',
      },
    },
  },
});
