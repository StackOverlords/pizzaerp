import type { IOrderRepository } from '../../domain/repositories/i-order-repository'
import type { IShiftRepository } from '../../domain/repositories/i-shift-repository'
import type { IDishRepository } from '../../domain/repositories/i-dish-repository'
import type { OrderWithItems } from '../../domain/entities/order'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  orderRepository: IOrderRepository
  shiftRepository: IShiftRepository
  dishRepository: IDishRepository
}

export interface CreateOrderInput {
  userId: string
  branchId: string
  notes?: string
  items: Array<{
    dishId: string
    quantity: number
    notes?: string
  }>
}

export function createCreateOrderUseCase({ orderRepository, shiftRepository, dishRepository }: Dependencies) {
  return async function createOrder(input: CreateOrderInput): Promise<OrderWithItems> {
    if (input.items.length === 0) {
      throw Errors.badRequest('El pedido debe tener al menos un ítem')
    }

    for (const item of input.items) {
      if (item.quantity < 1) {
        throw Errors.badRequest('La cantidad de cada ítem debe ser >= 1')
      }
    }

    const shift = await shiftRepository.findOpenByUser(input.userId, input.branchId)
    if (!shift) {
      throw Errors.conflict('No hay turno abierto para este cajero en esta sucursal')
    }

    const resolvedItems = await Promise.all(
      input.items.map(async (item) => {
        const dish = await dishRepository.findById(item.dishId)
        if (!dish) throw Errors.badRequest(`Platillo '${item.dishId}' no encontrado`)
        if (!dish.active) throw Errors.badRequest(`Platillo '${dish.name}' está inactivo`)
        const itemSubtotal = dish.salePrice * item.quantity
        return {
          dishId: dish.id,
          dishName: dish.name,
          unitPrice: dish.salePrice,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          notes: item.notes,
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
