import type { PrismaClient } from '@prisma/client'
import type { IShiftRepository, OpenShiftData, FindClosedOpts } from '../../../domain/repositories/i-shift-repository'
import type { Shift, ShiftWithClosure } from '../../../domain/entities/shift'
import type { ShiftStatus } from '../../../domain/entities/shift'
import type { ShiftSalesSummary, ShiftClosure } from '../../../domain/entities/shift-closure'

type RawShift = {
  id: string
  branch_id: string
  user_id: string
  opened_at: Date
  closed_at: Date | null
  initial_cash: unknown
  status: string
}

export class PrismaShiftRepository implements IShiftRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async findOpenByUser(userId: string, branchId: string): Promise<Shift | null> {
    const rows = await this.db.$queryRawUnsafe<RawShift[]>(
      `SELECT id, branch_id, user_id, opened_at, closed_at, initial_cash, status
       FROM "${this.schema}".shifts
       WHERE user_id = $1 AND branch_id = $2 AND status = 'OPEN'
       LIMIT 1`,
      userId,
      branchId,
    )
    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async findById(id: string): Promise<Shift | null> {
    const rows = await this.db.$queryRawUnsafe<RawShift[]>(
      `SELECT id, branch_id, user_id, opened_at, closed_at, initial_cash, status
       FROM "${this.schema}".shifts
       WHERE id = $1`,
      id,
    )
    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async open(data: OpenShiftData): Promise<Shift> {
    const rows = await this.db.$queryRawUnsafe<RawShift[]>(
      `INSERT INTO "${this.schema}".shifts (branch_id, user_id, initial_cash)
       VALUES ($1, $2, $3)
       RETURNING id, branch_id, user_id, opened_at, closed_at, initial_cash, status`,
      data.branchId,
      data.userId,
      data.initialCash,
    )
    return this.toEntity(rows[0])
  }

  async close(id: string): Promise<Shift> {
    const rows = await this.db.$queryRawUnsafe<RawShift[]>(
      `UPDATE "${this.schema}".shifts
       SET status = 'CLOSED', closed_at = now()
       WHERE id = $1
       RETURNING id, branch_id, user_id, opened_at, closed_at, initial_cash, status`,
      id,
    )
    return this.toEntity(rows[0])
  }

  async getSalesSummary(shiftId: string): Promise<ShiftSalesSummary> {
    const rows = await this.db.$queryRawUnsafe<{
      cash_from_sales: unknown
      qr_total: unknown
      qr_count: bigint
    }[]>(
      `SELECT
         COALESCE(SUM(p.amount) FILTER (WHERE p.method = 'CASH'), 0) AS cash_from_sales,
         COALESCE(SUM(p.amount) FILTER (WHERE p.method = 'QR'),  0) AS qr_total,
         COALESCE(COUNT(p.id)  FILTER (WHERE p.method = 'QR'),  0) AS qr_count
       FROM "${this.schema}".payments p
       JOIN "${this.schema}".orders o ON o.id = p.order_id
       WHERE o.shift_id = $1 AND o.status = 'PAID'`,
      shiftId,
    )
    const row = rows[0]
    return {
      cashFromSales: Number(row.cash_from_sales),
      qrTotal: Number(row.qr_total),
      qrCount: Number(row.qr_count),
    }
  }

  async findClosed(branchId: string, opts: FindClosedOpts): Promise<{ data: ShiftWithClosure[]; total: number }> {
    const offset = (opts.page - 1) * opts.limit
    const from = opts.from ?? null
    const to = opts.to ?? null

    type RawRow = RawShift & {
      closure_id: string | null
      closure_declared_cash: unknown
      closure_declared_qr_count: number | bigint | null
      closure_expected_cash: unknown
      closure_expected_qr_total: unknown
      closure_expected_qr_count: number | bigint | null
      closure_cash_difference: unknown
      closure_qr_count_difference: number | bigint | null
      closure_notes: string | null
      closure_closed_at: Date | null
    }

    const rows = await this.db.$queryRawUnsafe<RawRow[]>(
      `SELECT s.id, s.branch_id, s.user_id, s.opened_at, s.closed_at, s.initial_cash, s.status,
              sc.id              AS closure_id,
              sc.declared_cash   AS closure_declared_cash,
              sc.declared_qr_count AS closure_declared_qr_count,
              sc.expected_cash   AS closure_expected_cash,
              sc.expected_qr_total AS closure_expected_qr_total,
              sc.expected_qr_count AS closure_expected_qr_count,
              sc.cash_difference AS closure_cash_difference,
              sc.qr_count_difference AS closure_qr_count_difference,
              sc.notes           AS closure_notes,
              sc.closed_at       AS closure_closed_at
       FROM "${this.schema}".shifts s
       LEFT JOIN "${this.schema}".shift_closures sc ON sc.shift_id = s.id
       WHERE s.branch_id = $1 AND s.status = 'CLOSED'
         AND ($2::timestamptz IS NULL OR s.closed_at >= $2)
         AND ($3::timestamptz IS NULL OR s.closed_at <= $3)
       ORDER BY s.opened_at DESC
       LIMIT $4 OFFSET $5`,
      branchId, from, to, opts.limit, offset,
    )

    const countRows = await this.db.$queryRawUnsafe<{ total: bigint }[]>(
      `SELECT COUNT(*) AS total
       FROM "${this.schema}".shifts s
       WHERE s.branch_id = $1 AND s.status = 'CLOSED'
         AND ($2::timestamptz IS NULL OR s.closed_at >= $2)
         AND ($3::timestamptz IS NULL OR s.closed_at <= $3)`,
      branchId, from, to,
    )

    const toShiftClosure = (row: RawRow): ShiftClosure | null => {
      if (!row.closure_id) return null
      return {
        id: row.closure_id,
        shiftId: row.id,
        declaredCash: Number(row.closure_declared_cash),
        declaredQrCount: Number(row.closure_declared_qr_count),
        expectedCash: Number(row.closure_expected_cash),
        expectedQrTotal: Number(row.closure_expected_qr_total),
        expectedQrCount: Number(row.closure_expected_qr_count),
        cashDifference: Number(row.closure_cash_difference),
        qrCountDifference: Number(row.closure_qr_count_difference),
        notes: row.closure_notes,
        closedAt: row.closure_closed_at!,
      }
    }

    return {
      data: rows.map(row => ({ ...this.toEntity(row), closure: toShiftClosure(row) })),
      total: Number(countRows[0].total),
    }
  }

  private toEntity(raw: RawShift): Shift {
    return {
      id: raw.id,
      branchId: raw.branch_id,
      userId: raw.user_id,
      openedAt: raw.opened_at,
      closedAt: raw.closed_at,
      initialCash: Number(raw.initial_cash),
      status: raw.status as ShiftStatus,
    }
  }
}
