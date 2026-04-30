import type { Payment, PaymentMethod } from '../entities/payment'

export interface CreatePaymentData {
  orderId: string
  method: PaymentMethod
  amount: number
  changeAmount?: number
  reference?: string
}

export interface IPaymentRepository {
  create(data: CreatePaymentData): Promise<Payment>
}
