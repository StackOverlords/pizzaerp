export const DiscountType = { AMOUNT: 'AMOUNT', PERCENTAGE: 'PERCENTAGE' } as const
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType]

export interface OrderDiscount {
  id: string
  orderId: string
  adminUserId: string
  type: DiscountType
  value: number
  amount: number
  reason: string | null
  appliedAt: Date
}
