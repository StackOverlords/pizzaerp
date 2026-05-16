export const OrderStatus = { PENDING: 'PENDING', PAID: 'PAID', CANCELLED: 'CANCELLED' } as const
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

export const OrderItemKind = { DISH: 'DISH', COMBO: 'COMBO' } as const
export type OrderItemKind = (typeof OrderItemKind)[keyof typeof OrderItemKind]

export interface OrderItemComboSelection {
  id: string
  orderItemId: string
  comboSlotId: string | null
  slotName: string
  dishId: string | null
  dishName: string
  orderIndex: number
}

export interface OrderItemExtra {
  id: string
  orderItemId: string
  dishIngredientId: string | null
  ingredientName: string
  quantity: number
  unitCost: number
  subtotal: number
}

export interface OrderItemExclusion {
  id: string
  orderItemId: string
  dishIngredientId: string | null
  ingredientName: string
}

export interface OrderItem {
  id: string
  orderId: string
  kind: OrderItemKind
  dishId: string | null
  dishName: string
  comboId: string | null
  comboName: string | null
  unitPrice: number
  quantity: number
  subtotal: number
  notes: string | null
  createdAt: Date
  extras: OrderItemExtra[]
  exclusions: OrderItemExclusion[]
  selections: OrderItemComboSelection[]
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
