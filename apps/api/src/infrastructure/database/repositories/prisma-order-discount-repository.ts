import type { PrismaClient } from '@prisma/client'
import type { IOrderDiscountRepository, CreateDiscountData } from '../../../domain/repositories/i-order-discount-repository'
import type { OrderDiscount, DiscountType } from '../../../domain/entities/order-discount'

type RawDiscount = {
  id: string
  order_id: string
  admin_user_id: string
  type: string
  value: unknown
  amount: unknown
  reason: string | null
  applied_at: Date
}

export class PrismaOrderDiscountRepository implements IOrderDiscountRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async create(data: CreateDiscountData): Promise<OrderDiscount> {
    const rows = await this.db.$queryRawUnsafe<RawDiscount[]>(
      `INSERT INTO "${this.schema}".order_discounts
         (order_id, admin_user_id, type, value, amount, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, order_id, admin_user_id, type, value, amount, reason, applied_at`,
      data.orderId,
      data.adminUserId,
      data.type,
      data.value,
      data.amount,
      data.reason ?? null,
    )
    return this.toEntity(rows[0])
  }

  private toEntity(raw: RawDiscount): OrderDiscount {
    return {
      id: raw.id,
      orderId: raw.order_id,
      adminUserId: raw.admin_user_id,
      type: raw.type as DiscountType,
      value: Number(raw.value),
      amount: Number(raw.amount),
      reason: raw.reason,
      appliedAt: raw.applied_at,
    }
  }
}
