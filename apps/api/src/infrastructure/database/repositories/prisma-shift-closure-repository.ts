import type { PrismaClient } from '@prisma/client'
import type { IShiftClosureRepository, CreateShiftClosureData } from '../../../domain/repositories/i-shift-closure-repository'
import type { ShiftClosure } from '../../../domain/entities/shift-closure'

type RawClosure = {
  id: string
  shift_id: string
  declared_cash: unknown
  declared_qr_count: number | bigint
  expected_cash: unknown
  expected_qr_total: unknown
  expected_qr_count: number | bigint
  cash_difference: unknown
  qr_count_difference: number | bigint
  notes: string | null
  closed_at: Date
}

export class PrismaShiftClosureRepository implements IShiftClosureRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async findByShiftId(shiftId: string): Promise<ShiftClosure | null> {
    const rows = await this.db.$queryRawUnsafe<RawClosure[]>(
      `SELECT id, shift_id, declared_cash, declared_qr_count, expected_cash,
              expected_qr_total, expected_qr_count, cash_difference, qr_count_difference,
              notes, closed_at
       FROM "${this.schema}".shift_closures
       WHERE shift_id = $1`,
      shiftId,
    )
    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async create(data: CreateShiftClosureData): Promise<ShiftClosure> {
    const rows = await this.db.$queryRawUnsafe<RawClosure[]>(
      `INSERT INTO "${this.schema}".shift_closures
         (shift_id, declared_cash, declared_qr_count, expected_cash,
          expected_qr_total, expected_qr_count, cash_difference, qr_count_difference, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, shift_id, declared_cash, declared_qr_count, expected_cash,
                 expected_qr_total, expected_qr_count, cash_difference, qr_count_difference,
                 notes, closed_at`,
      data.shiftId,
      data.declaredCash,
      data.declaredQrCount,
      data.expectedCash,
      data.expectedQrTotal,
      data.expectedQrCount,
      data.cashDifference,
      data.qrCountDifference,
      data.notes ?? null,
    )
    return this.toEntity(rows[0])
  }

  private toEntity(raw: RawClosure): ShiftClosure {
    return {
      id: raw.id,
      shiftId: raw.shift_id,
      declaredCash: Number(raw.declared_cash),
      declaredQrCount: Number(raw.declared_qr_count),
      expectedCash: Number(raw.expected_cash),
      expectedQrTotal: Number(raw.expected_qr_total),
      expectedQrCount: Number(raw.expected_qr_count),
      cashDifference: Number(raw.cash_difference),
      qrCountDifference: Number(raw.qr_count_difference),
      notes: raw.notes,
      closedAt: raw.closed_at,
    }
  }
}
