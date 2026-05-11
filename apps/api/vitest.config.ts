import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/saaserp',
      SUPER_ADMIN_KEY: 'dev-super-admin-key-change-in-production',
    },
  },
})
