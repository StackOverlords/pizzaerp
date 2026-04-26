import Fastify from 'fastify'
import cors from '@fastify/cors'
import { healthRoute } from './routes/health'

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
})

const start = async () => {
  await server.register(cors, { origin: true })
  await server.register(healthRoute)

  const port = Number(process.env.PORT ?? 3000)
  await server.listen({ port, host: '0.0.0.0' })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
