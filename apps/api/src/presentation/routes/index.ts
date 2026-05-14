import type { FastifyInstance } from 'fastify'
import { healthRoute } from './health'
import { authRoutes } from './auth'
import { configRoutes } from './config'
import { setupRoutes } from './setup'
import { adminRoutes } from './admin'
import { branchRoutes } from './branches'
import { userRoutes } from './users'
import { ingredientRoutes } from './ingredients'
import { categoryRoutes } from './categories'
import { dishRoutes } from './dishes'
import { dishIngredientRoutes } from './dish-ingredients'
import { comboRoutes } from './combos'
import { shiftRoutes } from './shifts'
import { orderRoutes } from './orders'
import { supplyTypeRoutes } from './supply-types'
import { supplyTransferRoutes } from './supply-transfers'
import { supplyWastageRoutes } from './supply-wastages'
import { supplyClosingRoutes } from './supply-closings'
import { reportRoutes } from './reports'
import { tenantSettingsRoutes } from './tenant-settings'

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(healthRoute, { prefix: '/api/v1' })
  fastify.register(authRoutes, { prefix: '/api/v1/auth' })
  fastify.register(configRoutes, { prefix: '/api/v1/config' })
  fastify.register(setupRoutes, { prefix: '/api/v1/setup' })
  fastify.register(adminRoutes, { prefix: '/api/v1/admin' })
  fastify.register(branchRoutes, { prefix: '/api/v1/branches' })
  fastify.register(userRoutes, { prefix: '/api/v1/users' })
  fastify.register(ingredientRoutes, { prefix: '/api/v1/ingredients' })
  fastify.register(categoryRoutes, { prefix: '/api/v1/categories' })
  fastify.register(dishRoutes, { prefix: '/api/v1/dishes' })
  fastify.register(dishIngredientRoutes, { prefix: '/api/v1/dishes' })
  fastify.register(comboRoutes, { prefix: '/api/v1/combos' })
  fastify.register(shiftRoutes, { prefix: '/api/v1/shifts' })
  fastify.register(orderRoutes, { prefix: '/api/v1/orders' })
  fastify.register(supplyTypeRoutes, { prefix: '/api/v1/supply-types' })
  fastify.register(supplyTransferRoutes, { prefix: '/api/v1/supply-transfers' })
  fastify.register(supplyWastageRoutes, { prefix: '/api/v1/supply-wastages' })
  fastify.register(supplyClosingRoutes, { prefix: '/api/v1/supply-closings' })
  fastify.register(reportRoutes, { prefix: '/api/v1/reports' })
  fastify.register(tenantSettingsRoutes, { prefix: '/api/v1/tenant-settings' })
}
