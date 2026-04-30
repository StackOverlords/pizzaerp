import type { PrismaClient } from '@prisma/client'
import type { IDoughDayClosureRepository, CreateDoughDayClosureData, ReportOpts } from '../../../domain/repositories/i-dough-day-closure-repository'
import type { DoughDayClosure, DoughClosureSummary } from '../../../domain/entities/dough-day-closure'
import type { DoughType } from '../../../domain/entities/dough-transfer'
import type { DoughTransferReport } from '../../../domain/entities/dough-transfer-report'
import { computeStatus, worstStatus } from '../../../domain/entities/dough-transfer-report'

type RawClosure = {
  id: string
  branch_id: string
  closure_date: Date
  dough_type: string
  initial_count: number | bigint
  sold_count: number | bigint
  wastage_count: number | bigint
  theoretical_remaining: number | bigint
  actual_remaining: number | bigint
  difference: number | bigint
  notes: string | null
  closed_by_user_id: string
  closed_at: Date
}

export class PrismaDoughDayClosureRepository implements IDoughDayClosureRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async getSummary(branchId: string, closureDate: Date): Promise<DoughClosureSummary[]> {
    type RawSummary = { dough_type: string; initial_count: unknown; wastage_count: unknown }

    const rows = await this.db.$queryRawUnsafe<RawSummary[]>(
      `SELECT
         dti.dough_type,
         COALESCE(SUM(dti.quantity_received), 0) AS initial_count,
         COALESCE((
           SELECT SUM(dw.quantity)
           FROM "${this.schema}".dough_wastages dw
           WHERE dw.branch_id = $1
             AND DATE(dw.recorded_at) = $2::date
             AND dw.dough_type = dti.dough_type
         ), 0) AS wastage_count
       FROM "${this.schema}".dough_transfer_items dti
       JOIN "${this.schema}".dough_transfers dt ON dt.id = dti.transfer_id
       WHERE dt.to_branch_id = $1
         AND dt.transfer_date = $2::date
         AND dt.status = 'RECEIVED'
         AND dti.quantity_received IS NOT NULL
       GROUP BY dti.dough_type`,
      branchId, closureDate,
    )

    return rows.map(r => ({
      doughType: r.dough_type as DoughType,
      initialCount: Number(r.initial_count),
      wastageCount: Number(r.wastage_count),
    }))
  }

  async create(data: CreateDoughDayClosureData): Promise<DoughDayClosure> {
    // Compute initial_count and wastage_count from DB
    type RawCount = { initial_count: unknown; wastage_count: unknown }
    const counts = await this.db.$queryRawUnsafe<RawCount[]>(
      `SELECT
         COALESCE((
           SELECT SUM(dti.quantity_received)
           FROM "${this.schema}".dough_transfer_items dti
           JOIN "${this.schema}".dough_transfers dt ON dt.id = dti.transfer_id
           WHERE dt.to_branch_id = $1
             AND dt.transfer_date = $2::date
             AND dt.status = 'RECEIVED'
             AND dti.dough_type = $3
             AND dti.quantity_received IS NOT NULL
         ), 0) AS initial_count,
         COALESCE((
           SELECT SUM(dw.quantity)
           FROM "${this.schema}".dough_wastages dw
           WHERE dw.branch_id = $1
             AND DATE(dw.recorded_at) = $2::date
             AND dw.dough_type = $3
         ), 0) AS wastage_count`,
      data.branchId, data.closureDate, data.doughType,
    )

    const initialCount = Number(counts[0].initial_count)
    const wastageCount = Number(counts[0].wastage_count)
    const theoreticalRemaining = initialCount - data.soldCount - wastageCount
    const difference = data.actualRemaining - theoreticalRemaining

    const rows = await this.db.$queryRawUnsafe<RawClosure[]>(
      `INSERT INTO "${this.schema}".dough_day_closures
         (branch_id, closure_date, dough_type, initial_count, sold_count, wastage_count,
          theoretical_remaining, actual_remaining, difference, notes, closed_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      data.branchId, data.closureDate, data.doughType,
      initialCount, data.soldCount, wastageCount,
      theoreticalRemaining, data.actualRemaining, difference,
      data.notes, data.closedByUserId,
    )
    return this.toEntity(rows[0])
  }

  async findByBranchAndDate(branchId: string, closureDate: Date, doughType: DoughType): Promise<DoughDayClosure | null> {
    const rows = await this.db.$queryRawUnsafe<RawClosure[]>(
      `SELECT * FROM "${this.schema}".dough_day_closures
       WHERE branch_id = $1 AND closure_date = $2::date AND dough_type = $3`,
      branchId, closureDate, doughType,
    )
    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async list(branchId: string, from?: Date, to?: Date): Promise<DoughDayClosure[]> {
    const rows = await this.db.$queryRawUnsafe<RawClosure[]>(
      `SELECT * FROM "${this.schema}".dough_day_closures
       WHERE branch_id = $1
         AND ($2::date IS NULL OR closure_date >= $2)
         AND ($3::date IS NULL OR closure_date <= $3)
       ORDER BY closure_date DESC, dough_type`,
      branchId, from ?? null, to ?? null,
    )
    return rows.map(r => this.toEntity(r))
  }

  async getReport(opts: ReportOpts): Promise<DoughTransferReport[]> {
    const rows = await this.db.$queryRawUnsafe<RawClosure[]>(
      `SELECT * FROM "${this.schema}".dough_day_closures
       WHERE ($1::text IS NULL OR branch_id = $1)
         AND ($2::date IS NULL OR closure_date >= $2)
         AND ($3::date IS NULL OR closure_date <= $3)
       ORDER BY closure_date DESC, branch_id, dough_type`,
      opts.branchId ?? null,
      opts.from ?? null,
      opts.to ?? null,
    )

    // Group by (branch_id, closure_date)
    const grouped = new Map<string, RawClosure[]>()
    for (const row of rows) {
      const key = `${row.branch_id}|${row.closure_date.toISOString().slice(0, 10)}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(row)
    }

    const reports: DoughTransferReport[] = []
    for (const [key, group] of grouped) {
      const [branchId, date] = key.split('|')
      const doughTypes = group.map(row => {
        const difference = Number(row.difference)
        return {
          doughType: row.dough_type as DoughType,
          initialCount: Number(row.initial_count),
          soldCount: Number(row.sold_count),
          wastageCount: Number(row.wastage_count),
          theoreticalRemaining: Number(row.theoretical_remaining),
          actualRemaining: Number(row.actual_remaining),
          difference,
          status: computeStatus(difference),
        }
      })
      reports.push({
        branchId,
        date,
        doughTypes,
        overallStatus: worstStatus(doughTypes.map(d => d.status)),
      })
    }

    return reports
  }

  private toEntity(raw: RawClosure): DoughDayClosure {
    return {
      id: raw.id,
      branchId: raw.branch_id,
      closureDate: raw.closure_date,
      doughType: raw.dough_type as DoughType,
      initialCount: Number(raw.initial_count),
      soldCount: Number(raw.sold_count),
      wastageCount: Number(raw.wastage_count),
      theoreticalRemaining: Number(raw.theoretical_remaining),
      actualRemaining: Number(raw.actual_remaining),
      difference: Number(raw.difference),
      notes: raw.notes,
      closedByUserId: raw.closed_by_user_id,
      closedAt: raw.closed_at,
    }
  }
}
