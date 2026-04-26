import type { FastifyInstance } from 'fastify'

export async function healthRoute(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.0.1',
    }
  })
}
