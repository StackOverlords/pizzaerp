import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/renderer/__tests__/setup.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    server: {
      deps: {
        // Force ESM deps through Vite transform so they share the same React instance
        inline: ['@base-ui/react', 'lucide-react'],
      },
    },
  },
  resolve: {
    alias: {
      '@': `${__dirname}src/renderer`,
    },
    dedupe: ['react', 'react-dom'],
  },
})
