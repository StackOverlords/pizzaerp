import type { PrismaClient } from '@prisma/client'
import type { IPaymentRepository, CreatePaymentData } from '../../../domain/repositories/i-payment-repository'
import type { Payment, PaymentMethod } from '../../../domain/entities/payment'

type RawPayment = {
  id: string
  order_id: string
  method: string
  amount: unknown
  change_amount: unknown
  reference: string | null
  paid_at: Date
}

export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async create(data: CreatePaymentData): Promise<Payment> {
    const rows = await this.db.$queryRawUnsafe<RawPayment[]>(
      `INSERT INTO "${this.schema}".payments (order_id, method, amount, change_amount, reference)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, order_id, method, amount, change_amount, reference, paid_at`,
      data.orderId,
      data.method,
      data.amount,
      data.changeAmount ?? null,
      data.reference ?? null,
    )
    return this.toEntity(rows[0])
  }

  private toEntity(raw: RawPayment): Payment {
    return {
      id: raw.id,
      orderId: raw.order_id,
      method: raw.method as PaymentMethod,
      amount: Number(raw.amount),
      changeAmount: raw.change_amount !== null ? Number(raw.change_amount) : null,
      reference: raw.reference,
      paidAt: raw.paid_at,
    }
  }
}
