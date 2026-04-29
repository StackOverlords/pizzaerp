export const PaymentMethod = { CASH: 'CASH', QR: 'QR' } as const
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]

export interface Payment {
  id: string
  orderId: string
  method: PaymentMethod
  amount: number
  changeAmount: number | null
  reference: string | null
  paidAt: Date
}
