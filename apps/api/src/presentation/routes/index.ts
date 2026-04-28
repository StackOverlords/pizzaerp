import type { FastifyInstance } from 'fastify'
import { healthRoute } from './health'
import { authRoutes } from './auth'

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(healthRoute, { prefix: '/api/v1' })
  fastify.register(authRoutes, { prefix: '/api/v1/auth' })
}
