export interface OrderCancellation {
  id: string
  orderId: string
  adminUserId: string
  cajeroUserId: string
  reason: string | null
  cancelledAt: Date
}
