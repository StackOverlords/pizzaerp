import type { PrismaClient } from '@prisma/client'
import type {
  ICashMovementRepository,
  CreateCashMovementData,
} from '../../../domain/repositories/i-cash-movement-repository'
import type {
  CashMovement,
  CashMovementSummary,
} from '../../../domain/entities/cash-movement'
import { CashMovementType } from '../../../domain/entities/cash-movement'

type RawMovement = {
  id: string
  shift_id: string
  type: string
  amount: unknown
  reason: string
  created_by_user_id: string
  created_at: Date
}

export class PrismaCashMovementRepository implements ICashMovementRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async create(data: CreateCashMovementData): Promise<CashMovement> {
    const rows = await this.db.$queryRawUnsafe<RawMovement[]>(
      `INSERT INTO "${this.schema}".cash_movements
         (shift_id, type, amount, reason, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, shift_id, type, amount, reason, created_by_user_id, created_at`,
      data.shiftId,
      data.type,
      data.amount,
      data.reason,
      data.createdByUserId,
    )
    return this.toEntity(rows[0])
  }

  async listByShift(shiftId: string): Promise<CashMovement[]> {
    const rows = await this.db.$queryRawUnsafe<RawMovement[]>(
      `SELECT id, shift_id, type, amount, reason, created_by_user_id, created_at
       FROM "${this.schema}".cash_movements
       WHERE shift_id = $1
       ORDER BY created_at DESC`,
      shiftId,
    )
    return rows.map((r) => this.toEntity(r))
  }

  async getSummaryForShift(shiftId: string): Promise<CashMovementSummary> {
    const rows = await this.db.$queryRawUnsafe<{
      ingreso_total: unknown
      retiro_total: unknown
    }[]>(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE type = 'INGRESO'), 0) AS ingreso_total,
         COALESCE(SUM(amount) FILTER (WHERE type = 'RETIRO'),  0) AS retiro_total
       FROM "${this.schema}".cash_movements
       WHERE shift_id = $1`,
      shiftId,
    )
    return {
      ingresoTotal: Number(rows[0].ingreso_total),
      retiroTotal:  Number(rows[0].retiro_total),
    }
  }

  private toEntity(raw: RawMovement): CashMovement {
    return {
      id:              raw.id,
      shiftId:         raw.shift_id,
      type:            raw.type as CashMovementType,
      amount:          Number(raw.amount),
      reason:          raw.reason,
      createdByUserId: raw.created_by_user_id,
      createdAt:       raw.created_at,
    }
  }
}
