import type { OrderDiscount, DiscountType } from '../entities/order-discount'

export interface CreateDiscountData {
  orderId: string
  adminUserId: string
  type: DiscountType
  value: number
  amount: number
  reason?: string
}

export interface IOrderDiscountRepository {
  create(data: CreateDiscountData): Promise<OrderDiscount>
}
