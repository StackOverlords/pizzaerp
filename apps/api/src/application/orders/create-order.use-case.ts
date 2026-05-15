import type { IOrderRepository } from '../../domain/repositories/i-order-repository'
import type { IShiftRepository } from '../../domain/repositories/i-shift-repository'
import type { IDishRepository } from '../../domain/repositories/i-dish-repository'
import type { IDishIngredientRepository } from '../../domain/repositories/i-dish-ingredient-repository'
import type { OrderWithItems } from '../../domain/entities/order'
import type {
  CreateOrderItemExtraData,
  CreateOrderItemExclusionData,
} from '../../domain/repositories/i-order-repository'
import { DishIngredientBehavior } from '../../domain/entities/dish-ingredient'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  orderRepository: IOrderRepository
  shiftRepository: IShiftRepository
  dishRepository: IDishRepository
  dishIngredientRepository: IDishIngredientRepository
}

export interface CreateOrderInput {
  userId: string
  branchId: string
  notes?: string
  items: Array<{
    dishId: string
    quantity: number
    notes?: string
    extras?: Array<{ dishIngredientId: string; quantity: number }>
    exclusions?: Array<{ dishIngredientId: string }>
  }>
}

export function createCreateOrderUseCase({
  orderRepository,
  shiftRepository,
  dishRepository,
  dishIngredientRepository,
}: Dependencies) {
  return async function createOrder(input: CreateOrderInput): Promise<OrderWithItems> {
    if (input.items.length === 0) {
      throw Errors.badRequest('Order must have at least one item')
    }

    for (const item of input.items) {
      if (item.quantity < 1) {
        throw Errors.badRequest('Each item quantity must be >= 1')
      }
    }

    const shift = await shiftRepository.findOpenByUser(input.userId, input.branchId)
    if (!shift) {
      throw Errors.conflict('No open shift for this cashier at this branch')
    }

    const resolvedItems = await Promise.all(
      input.items.map(async (item) => {
        const dish = await dishRepository.findById(item.dishId)
        if (!dish) throw Errors.badRequest(`Platillo '${item.dishId}' no encontrado`)
        if (!dish.active) throw Errors.badRequest(`Platillo '${dish.name}' está inactivo`)

        const hasExtras = item.extras && item.extras.length > 0
        const hasExclusions = item.exclusions && item.exclusions.length > 0

        // Skip fetch if no personalization needed (optimization)
        let dishIngredientMap = new Map<string, { id: string; behavior: string; extraCost: number | null; ingredient: { name: string } }>()
        if (hasExtras || hasExclusions) {
          const dishIngredients = await dishIngredientRepository.listByDishWithIngredient(dish.id)
          for (const di of dishIngredients) {
            dishIngredientMap.set(di.id, di)
          }
        }

        // ── Resolve extras ──────────────────────────────────────────────────────
        const resolvedExtras: CreateOrderItemExtraData[] = []
        let extrasCostPerUnit = 0

        for (const e of item.extras ?? []) {
          const di = dishIngredientMap.get(e.dishIngredientId)
          if (!di) {
            throw Errors.badRequest(
              `Ingrediente '${e.dishIngredientId}' no pertenece al platillo '${dish.name}'`,
            )
          }
          if (di.behavior === DishIngredientBehavior.INCLUDED) {
            throw Errors.badRequest(
              `'${di.ingredient.name}' ya está incluido en el platillo y no puede agregarse como extra`,
            )
          }
          if (e.quantity <= 0) {
            throw Errors.badRequest(`Cantidad inválida para el extra '${di.ingredient.name}'`)
          }
          const unitCost = di.extraCost ?? 0
          const subtotal = unitCost * e.quantity
          extrasCostPerUnit += subtotal
          resolvedExtras.push({
            dishIngredientId: di.id,
            ingredientName: di.ingredient.name,
            quantity: e.quantity,
            unitCost,
            subtotal,
          })
        }

        // ── Resolve exclusions ──────────────────────────────────────────────────
        const resolvedExclusions: CreateOrderItemExclusionData[] = []

        for (const x of item.exclusions ?? []) {
          const di = dishIngredientMap.get(x.dishIngredientId)
          if (!di) {
            throw Errors.badRequest(
              `Ingrediente '${x.dishIngredientId}' no pertenece al platillo '${dish.name}'`,
            )
          }
          if (di.behavior === DishIngredientBehavior.EXTRA) {
            throw Errors.badRequest(
              `'${di.ingredient.name}' no está en el platillo y no puede excluirse`,
            )
          }
          resolvedExclusions.push({
            dishIngredientId: di.id,
            ingredientName: di.ingredient.name,
          })
        }

        // ── Final price ─────────────────────────────────────────────────────────
        const unitPrice = dish.salePrice + extrasCostPerUnit
        const itemSubtotal = unitPrice * item.quantity

        return {
          dishId: dish.id,
          dishName: dish.name,
          unitPrice,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          notes: item.notes,
          extras: resolvedExtras.length > 0 ? resolvedExtras : undefined,
          exclusions: resolvedExclusions.length > 0 ? resolvedExclusions : undefined,
        }
      }),
    )

    const subtotal = resolvedItems.reduce((acc, i) => acc + i.subtotal, 0)

    // Calculates the next correlative number for this branch+day
    const orderNumber = await orderRepository.getNextOrderNumber(input.branchId)

    return orderRepository.create({
      orderNumber,
      shiftId: shift.id,
      branchId: input.branchId,
      userId: input.userId,
      subtotal,
      total: subtotal,
      notes: input.notes,
      items: resolvedItems,
    })
  }
}
