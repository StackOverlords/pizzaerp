import type { FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import fp from 'fastify-plugin'

export const swaggerPlugin = fp(async function swaggerPlugin(fastify: FastifyInstance) {
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'PizzaERP API',
        description: 'Sistema de gestión para pizzerías',
        version: process.env.npm_package_version ?? '0.0.1',
      },
      tags: [
        { name: 'health', description: 'Health check' },
        { name: 'auth', description: 'Autenticación' },
        { name: 'orders', description: 'Pedidos' },
        { name: 'menu', description: 'Menú' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list' },
  })
})
