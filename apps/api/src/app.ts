import Fastify, { type FastifyInstance } from 'fastify'
import sensible from '@fastify/sensible'
import { corsPlugin } from './shared/plugins/cors'
import { swaggerPlugin } from './shared/plugins/swagger'
import { errorHandler } from './shared/errors/error-handler'
import { registerRoutes } from './presentation/routes/index'

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  })

  await server.register(corsPlugin)
  await server.register(swaggerPlugin)
  await server.register(sensible)

  server.setErrorHandler(errorHandler)

  await server.register(registerRoutes)

  return server
}
