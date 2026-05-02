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
        { name: 'ingredients', description: 'Insumos' },
        { name: 'categories', description: 'Categorías' },
        { name: 'dishes', description: 'Platillos' },
        { name: 'dish-ingredients', description: 'Insumos de platillos' },
        { name: 'combos', description: 'Combos' },
        { name: 'shifts', description: 'Turnos de caja' },
        { name: 'orders', description: 'Pedidos' },
        { name: 'supply-types', description: 'Tipos de insumo configurables' },
        { name: 'supply-transfers', description: 'Transferencias de insumos' },
        { name: 'supply-wastages', description: 'Mermas de insumos' },
        { name: 'supply-closings', description: 'Cierre diario de control de insumos' },
        { name: 'reports', description: 'Reportes (dueña)' },
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
