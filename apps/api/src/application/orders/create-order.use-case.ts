import type { IOrderRepository } from '../../domain/repositories/i-order-repository'
import type { IShiftRepository } from '../../domain/repositories/i-shift-repository'
import type { IDishRepository } from '../../domain/repositories/i-dish-repository'
import type { IDishIngredientRepository } from '../../domain/repositories/i-dish-ingredient-repository'
import type { IComboRepository } from '../../domain/repositories/i-combo-repository'
import type { OrderWithItems } from '../../domain/entities/order'
import type {
  CreateOrderItemData,
  CreateOrderItemExtraData,
  CreateOrderItemExclusionData,
  CreateOrderItemComboSelectionData,
} from '../../domain/repositories/i-order-repository'
import { OrderItemKind } from '../../domain/entities/order'
import { DishIngredientBehavior } from '../../domain/entities/dish-ingredient'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  orderRepository: IOrderRepository
  shiftRepository: IShiftRepository
  dishRepository: IDishRepository
  dishIngredientRepository: IDishIngredientRepository
  comboRepository: IComboRepository
}

type DishItemInput = {
  kind: 'DISH'
  dishId: string
  quantity: number
  notes?: string
  extras?: Array<{ dishIngredientId: string; quantity: number }>
  exclusions?: Array<{ dishIngredientId: string }>
}

type ComboItemInput = {
  kind: 'COMBO'
  comboId: string
  quantity: number
  notes?: string
  selections: Array<{ comboSlotId: string; dishId: string }>
}

export interface CreateOrderInput {
  userId: string
  branchId: string
  notes?: string
  items: Array<DishItemInput | ComboItemInput>
}

export function createCreateOrderUseCase({
  orderRepository,
  shiftRepository,
  dishRepository,
  dishIngredientRepository,
  comboRepository,
}: Dependencies) {
  async function resolveDishItem(item: DishItemInput): Promise<CreateOrderItemData> {
    const dish = await dishRepository.findById(item.dishId)
    if (!dish) throw Errors.badRequest(`Platillo '${item.dishId}' no encontrado`)
    if (!dish.active) throw Errors.badRequest(`Platillo '${dish.name}' está inactivo`)

    const hasExtras = item.extras && item.extras.length > 0
    const hasExclusions = item.exclusions && item.exclusions.length > 0

    let dishIngredientMap = new Map<string, { id: string; behavior: string; extraCost: number | null; ingredient: { name: string } }>()
    if (hasExtras || hasExclusions) {
      const dishIngredients = await dishIngredientRepository.listByDishWithIngredient(dish.id)
      for (const di of dishIngredients) {
        dishIngredientMap.set(di.id, di)
      }
    }

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

    const unitPrice = dish.salePrice + extrasCostPerUnit
    const itemSubtotal = unitPrice * item.quantity

    return {
      kind: OrderItemKind.DISH,
      dishId: dish.id,
      dishName: dish.name,
      comboId: null,
      comboName: null,
      unitPrice,
      quantity: item.quantity,
      subtotal: itemSubtotal,
      notes: item.notes,
      extras: resolvedExtras.length > 0 ? resolvedExtras : undefined,
      exclusions: resolvedExclusions.length > 0 ? resolvedExclusions : undefined,
    }
  }

  async function resolveComboItem(item: ComboItemInput): Promise<CreateOrderItemData> {
    const combo = await comboRepository.findByIdWithDetails(item.comboId)
    if (!combo) throw Errors.notFound(`Combo '${item.comboId}' no encontrado`)
    if (!combo.active) throw Errors.badRequest(`El combo '${combo.name}' no está disponible`)

    if (combo.availableFrom && combo.availableTo) {
      const now = new Date()
      const hhmmss = now.toTimeString().slice(0, 8)
      if (hhmmss < combo.availableFrom || hhmmss > combo.availableTo) {
        throw Errors.badRequest(
          `El combo '${combo.name}' solo está disponible entre ${combo.availableFrom} y ${combo.availableTo}`,
        )
      }
    }

    const slotsById = new Map(combo.slots.map(s => [s.id, s]))

    for (const sel of item.selections) {
      const slot = slotsById.get(sel.comboSlotId)
      if (!slot || slot.comboId !== combo.id) {
        throw Errors.badRequest(`El slot '${sel.comboSlotId}' no pertenece al combo '${combo.name}'`)
      }
    }

    const requiredIds = combo.slots.filter(s => s.required).map(s => s.id)
    const givenIds = new Set(item.selections.map(s => s.comboSlotId))

    for (const reqId of requiredIds) {
      if (!givenIds.has(reqId)) {
        const slot = slotsById.get(reqId)!
        throw Errors.badRequest(`Falta selección para el slot requerido '${slot.name}'`)
      }
    }

    const dishIds = Array.from(new Set(item.selections.map(s => s.dishId)))
    const dishes = await Promise.all(dishIds.map(id => dishRepository.findById(id)))
    const dishMap = new Map(dishes.filter(Boolean).map(d => [d!.id, d!]))

    const resolvedSelections: CreateOrderItemComboSelectionData[] = []
    for (const sel of item.selections) {
      const slot = slotsById.get(sel.comboSlotId)!
      if (!slot.options.some(o => o.dishId === sel.dishId)) {
        throw Errors.badRequest(`La opción '${sel.dishId}' no es válida para el slot '${slot.name}'`)
      }
      const dish = dishMap.get(sel.dishId)
      if (!dish) throw Errors.badRequest(`Platillo '${sel.dishId}' no encontrado`)

      resolvedSelections.push({
        comboSlotId: slot.id,
        slotName: slot.name,
        dishId: dish.id,
        dishName: dish.name,
        orderIndex: slot.orderIndex,
      })
    }

    const unitPrice = combo.salePrice
    const subtotal = unitPrice * item.quantity

    return {
      kind: OrderItemKind.COMBO,
      dishId: null,
      dishName: combo.name,
      comboId: combo.id,
      comboName: combo.name,
      unitPrice,
      quantity: item.quantity,
      subtotal,
      notes: item.notes,
      selections: resolvedSelections,
    }
  }

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
        if (item.kind === 'COMBO') return resolveComboItem(item)
        return resolveDishItem(item)
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
