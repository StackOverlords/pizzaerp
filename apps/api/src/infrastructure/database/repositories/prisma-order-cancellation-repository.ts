import type { PrismaClient } from '@prisma/client'
import type { IOrderCancellationRepository, CreateCancellationData } from '../../../domain/repositories/i-order-cancellation-repository'
import type { OrderCancellation } from '../../../domain/entities/order-cancellation'

type RawCancellation = {
  id: string
  order_id: string
  admin_user_id: string
  cajero_user_id: string
  reason: string | null
  cancelled_at: Date
}

export class PrismaOrderCancellationRepository implements IOrderCancellationRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async create(data: CreateCancellationData): Promise<OrderCancellation> {
    const rows = await this.db.$queryRawUnsafe<RawCancellation[]>(
      `INSERT INTO "${this.schema}".order_cancellations
         (order_id, admin_user_id, cajero_user_id, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, order_id, admin_user_id, cajero_user_id, reason, cancelled_at`,
      data.orderId,
      data.adminUserId,
      data.cajeroUserId,
      data.reason ?? null,
    )
    return this.toEntity(rows[0])
  }

  private toEntity(raw: RawCancellation): OrderCancellation {
    return {
      id: raw.id,
      orderId: raw.order_id,
      adminUserId: raw.admin_user_id,
      cajeroUserId: raw.cajero_user_id,
      reason: raw.reason,
      cancelledAt: raw.cancelled_at,
    }
  }
}
