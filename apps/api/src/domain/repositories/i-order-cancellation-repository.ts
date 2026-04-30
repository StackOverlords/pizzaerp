import type { OrderCancellation } from '../entities/order-cancellation'

export interface CreateCancellationData {
  orderId: string
  adminUserId: string
  cajeroUserId: string
  reason?: string
}

export interface IOrderCancellationRepository {
  create(data: CreateCancellationData): Promise<OrderCancellation>
}
