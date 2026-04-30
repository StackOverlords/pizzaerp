import type { FastifyInstance } from 'fastify'
import { healthRoute } from './health'
import { authRoutes } from './auth'
import { ingredientRoutes } from './ingredients'
import { categoryRoutes } from './categories'
import { dishRoutes } from './dishes'
import { dishIngredientRoutes } from './dish-ingredients'
import { comboRoutes } from './combos'
import { shiftRoutes } from './shifts'
import { orderRoutes } from './orders'
import { doughTransferRoutes } from './dough-transfers'

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(healthRoute, { prefix: '/api/v1' })
  fastify.register(authRoutes, { prefix: '/api/v1/auth' })
  fastify.register(ingredientRoutes, { prefix: '/api/v1/ingredients' })
  fastify.register(categoryRoutes, { prefix: '/api/v1/categories' })
  fastify.register(dishRoutes, { prefix: '/api/v1/dishes' })
  fastify.register(dishIngredientRoutes, { prefix: '/api/v1/dishes' })
  fastify.register(comboRoutes, { prefix: '/api/v1/combos' })
  fastify.register(shiftRoutes, { prefix: '/api/v1/shifts' })
  fastify.register(orderRoutes, { prefix: '/api/v1/orders' })
  fastify.register(doughTransferRoutes, { prefix: '/api/v1/dough-transfers' })
}
