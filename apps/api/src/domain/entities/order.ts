export const OrderStatus = { PENDING: 'PENDING', PAID: 'PAID', CANCELLED: 'CANCELLED' } as const
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

export interface OrderItem {
  id: string
  orderId: string
  dishId: string | null
  dishName: string
  unitPrice: number
  quantity: number
  subtotal: number
  notes: string | null
  createdAt: Date
}

export interface Order {
  id: string
  orderNumber: number
  shiftId: string
  branchId: string
  userId: string
  status: OrderStatus
  subtotal: number
  discountAmount: number
  total: number
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
}
