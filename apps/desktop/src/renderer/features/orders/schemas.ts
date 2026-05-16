import { z } from 'zod'

// ── Enums (const object pattern — never union literals) ────────────────────────

export const ORDER_STATUS = { PENDING: 'PENDING', PAID: 'PAID', CANCELLED: 'CANCELLED' } as const
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

export const PAYMENT_METHOD = { CASH: 'CASH', QR: 'QR' } as const
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD]

export const DISCOUNT_TYPE = { AMOUNT: 'AMOUNT', PERCENTAGE: 'PERCENTAGE' } as const
export type DiscountType = (typeof DISCOUNT_TYPE)[keyof typeof DISCOUNT_TYPE]

export const ORDER_ITEM_KIND = { DISH: 'DISH', COMBO: 'COMBO' } as const
export type OrderItemKind = (typeof ORDER_ITEM_KIND)[keyof typeof ORDER_ITEM_KIND]

// ── Entities ───────────────────────────────────────────────────────────────────

export const orderItemComboSelectionSchema = z.object({
  id:          z.string(),
  orderItemId: z.string(),
  comboSlotId: z.string().nullable(),
  slotName:    z.string(),
  dishId:      z.string().nullable(),
  dishName:    z.string(),
  orderIndex:  z.number(),
})
export type OrderItemComboSelection = z.infer<typeof orderItemComboSelectionSchema>

export const orderItemExtraSchema = z.object({
  id:               z.string(),
  orderItemId:      z.string(),
  dishIngredientId: z.string().nullable(),
  ingredientName:   z.string(),
  quantity:         z.number(),
  unitCost:         z.number(),
  subtotal:         z.number(),
})
export type OrderItemExtra = z.infer<typeof orderItemExtraSchema>

export const orderItemExclusionSchema = z.object({
  id:               z.string(),
  orderItemId:      z.string(),
  dishIngredientId: z.string().nullable(),
  ingredientName:   z.string(),
})
export type OrderItemExclusion = z.infer<typeof orderItemExclusionSchema>

export const orderItemSchema = z.object({
  id:         z.string(),
  orderId:    z.string(),
  kind:       z.enum([ORDER_ITEM_KIND.DISH, ORDER_ITEM_KIND.COMBO]).default(ORDER_ITEM_KIND.DISH),
  dishId:     z.string().nullable(),
  dishName:   z.string(),
  comboId:    z.string().nullable().default(null),
  comboName:  z.string().nullable().default(null),
  unitPrice:  z.number(),
  quantity:   z.number().int(),
  subtotal:   z.number(),
  notes:      z.string().nullable(),
  createdAt:  z.coerce.date(),
  extras:     z.array(orderItemExtraSchema).default([]),
  exclusions: z.array(orderItemExclusionSchema).default([]),
  selections: z.array(orderItemComboSelectionSchema).default([]),
})
export type OrderItem = z.infer<typeof orderItemSchema>

export const orderHeaderSchema = z.object({
  id:             z.string(),
  orderNumber:    z.number().int(),
  shiftId:        z.string(),
  branchId:       z.string(),
  userId:         z.string(),
  status:         z.enum([ORDER_STATUS.PENDING, ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED]),
  subtotal:       z.number(),
  discountAmount: z.number(),
  total:          z.number(),
  notes:          z.string().nullable(),
  createdAt:      z.coerce.date(),
  updatedAt:      z.coerce.date(),
})
export type OrderHeader = z.infer<typeof orderHeaderSchema>

export const orderWithItemsSchema = orderHeaderSchema.extend({
  items: z.array(orderItemSchema),
})
export type OrderWithItems = z.infer<typeof orderWithItemsSchema>

// ── Dish (picker) ──────────────────────────────────────────────────────────────

export const dishSchema = z.object({
  id:         z.string(),
  name:       z.string(),
  salePrice:  z.number(),
  active:     z.boolean().optional(),
  categoryId: z.string().nullable().optional(),
})
export type Dish = z.infer<typeof dishSchema>

// ── Filters ────────────────────────────────────────────────────────────────────

export const orderFiltersSchema = z.object({
  page:      z.number().int().positive().default(1),
  limit:     z.number().int().positive().max(100).default(20),
  status:    z.enum([ORDER_STATUS.PENDING, ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED]).optional(),
  from:      z.string().optional(),
  to:        z.string().optional(),
  userId:    z.string().optional(),
  branchId:  z.string().optional(),
  shiftId:   z.string().optional(),
  sortBy:    z.enum(['createdAt', 'orderNumber', 'total']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
export type OrderFilters = z.infer<typeof orderFiltersSchema>

// ── Paginated list response ────────────────────────────────────────────────────

export const orderListPageSchema = z.object({
  data:  z.array(orderHeaderSchema),
  total: z.number().int().nonnegative(),
  page:  z.number().int().positive(),
  limit: z.number().int().positive(),
})
export type OrderListPage = z.infer<typeof orderListPageSchema>

// ── Form input schemas ─────────────────────────────────────────────────────────

export const orderItemDishInputSchema = z.object({
  kind:     z.literal(ORDER_ITEM_KIND.DISH),
  dishId:   z.string({ message: 'Requerido' }),
  quantity: z.number().int().positive('Cantidad debe ser positiva'),
  notes:    z.string().max(500).optional(),
  extras: z.array(z.object({
    dishIngredientId: z.string(),
    quantity:         z.number().positive(),
  })).optional(),
  exclusions: z.array(z.object({
    dishIngredientId: z.string(),
  })).optional(),
})
export type OrderItemDishInput = z.infer<typeof orderItemDishInputSchema>

export const orderItemComboInputSchema = z.object({
  kind:     z.literal(ORDER_ITEM_KIND.COMBO),
  comboId:  z.string({ message: 'Requerido' }),
  quantity: z.number().int().positive('Cantidad debe ser positiva'),
  notes:    z.string().max(500).optional(),
  selections: z.array(z.object({
    comboSlotId: z.string(),
    dishId:      z.string(),
  })).min(1),
})
export type OrderItemComboInput = z.infer<typeof orderItemComboInputSchema>

export const orderItemInputSchema = z.discriminatedUnion('kind', [
  orderItemDishInputSchema,
  orderItemComboInputSchema,
])
export type OrderItemInput = z.infer<typeof orderItemInputSchema>

export const createOrderInputSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, 'Agregá al menos un platillo o combo'),
  notes: z.string().max(500).optional(),
})
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

export const payOrderInputSchema = z.discriminatedUnion('method', [
  z.object({
    method:    z.literal(PAYMENT_METHOD.CASH),
    amount:    z.number().finite().positive('Monto requerido'),
    reference: z.string().optional(),
  }),
  z.object({
    method:    z.literal(PAYMENT_METHOD.QR),
    amount:    z.number().finite().nonnegative().optional(),
    reference: z.string().optional(),
  }),
])
export type PayOrderInput = z.infer<typeof payOrderInputSchema>

export const cancelOrderInputSchema = z.object({
  adminPin: z.string().optional(),
  reason:   z.string().max(500).optional(),
})
export type CancelOrderInput = z.infer<typeof cancelOrderInputSchema>

export const applyDiscountInputSchema = z.object({
  adminPin: z.string().optional(),
  type:     z.enum([DISCOUNT_TYPE.AMOUNT, DISCOUNT_TYPE.PERCENTAGE]),
  value:    z.number().finite().positive('Debe ser mayor a 0'),
  reason:   z.string().max(500).optional(),
})
export type ApplyDiscountInput = z.infer<typeof applyDiscountInputSchema>

// ── Mutation response wrappers ─────────────────────────────────────────────────

export const payOrderResponseSchema = z.object({
  order:   orderHeaderSchema,
  payment: z.object({
    id:        z.string(),
    method:    z.string(),
    amount:    z.number(),
    reference: z.string().nullable(),
    paidAt:    z.coerce.date(),
  }),
})
export type PayOrderResponse = z.infer<typeof payOrderResponseSchema>

export const cancelOrderResponseSchema = z.object({
  order:        orderHeaderSchema,
  cancellation: z.object({
    id:           z.string(),
    orderId:      z.string(),
    adminUserId:  z.string(),
    cajeroUserId: z.string(),
    reason:       z.string().nullable(),
    cancelledAt:  z.coerce.date(),
  }),
})
export type CancelOrderResponse = z.infer<typeof cancelOrderResponseSchema>

export const applyDiscountResponseSchema = z.object({
  order:    orderHeaderSchema,
  discount: z.object({
    id:          z.string(),
    type:        z.string(),
    value:       z.number(),
    amount:      z.number(),
    reason:      z.string().nullable(),
    appliedAt:   z.coerce.date(),
  }),
})
export type ApplyDiscountResponse = z.infer<typeof applyDiscountResponseSchema>
