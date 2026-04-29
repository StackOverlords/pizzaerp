import type { IOrderRepository } from '../../domain/repositories/i-order-repository'
import type { OrderWithItems } from '../../domain/entities/order'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  orderRepository: IOrderRepository
}

export function createGetOrderUseCase({ orderRepository }: Dependencies) {
  return async function getOrder(id: string): Promise<OrderWithItems> {
    const order = await orderRepository.findById(id)
    if (!order) throw Errors.notFound(`Order '${id}' not found`)
    return order
  }
}
