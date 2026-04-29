import type { OrderWithItems } from '../entities/order'

export interface CreateOrderItemData {
  dishId: string | null
  dishName: string
  unitPrice: number
  quantity: number
  subtotal: number
  notes?: string
}

export interface CreateOrderData {
  orderNumber: number
  shiftId: string
  branchId: string
  userId: string
  subtotal: number
  total: number
  notes?: string
  items: CreateOrderItemData[]
}

export interface IOrderRepository {
  getNextOrderNumber(branchId: string): Promise<number>
  create(data: CreateOrderData): Promise<OrderWithItems>
  findById(id: string): Promise<OrderWithItems | null>
  findByShiftId(shiftId: string): Promise<import('../entities/order').Order[]>
  pay(id: string): Promise<import('../entities/order').Order>
  cancel(id: string): Promise<import('../entities/order').Order>
  applyDiscount(id: string, discountAmount: number): Promise<import('../entities/order').Order>
}
