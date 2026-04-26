import type { FastifyInstance } from 'fastify'
import { healthRoute } from './health'

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(healthRoute, { prefix: '/api/v1' })
}
