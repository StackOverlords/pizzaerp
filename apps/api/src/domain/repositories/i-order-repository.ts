import type { Order, OrderWithItems } from '../entities/order'
import type { OrderStatus } from '../entities/order'

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

export interface ListOrdersFilters {
  branchId?: string
  shiftId?: string
  status?: OrderStatus
  userId?: string
  from?: string
  to?: string
  page: number
  limit: number
  sortBy: 'createdAt' | 'orderNumber' | 'total'
  sortOrder: 'asc' | 'desc'
}

export interface OrderListResult {
  data: Order[]
  total: number
  page: number
  limit: number
}

export interface IOrderRepository {
  getNextOrderNumber(branchId: string): Promise<number>
  create(data: CreateOrderData): Promise<OrderWithItems>
  findById(id: string): Promise<OrderWithItems | null>
  findByShiftId(shiftId: string): Promise<Order[]>
  pay(id: string): Promise<Order>
  cancel(id: string): Promise<Order>
  applyDiscount(id: string, discountAmount: number): Promise<Order>
  findMany(filters: ListOrdersFilters): Promise<OrderListResult>
}
