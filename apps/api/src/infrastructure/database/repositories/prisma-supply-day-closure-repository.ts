import type { PrismaClient } from '@prisma/client'
import type { ISupplyDayClosureRepository, CreateSupplyDayClosureData, ReportOpts } from '../../../domain/repositories/i-supply-day-closure-repository'
import type { SupplyDayClosure, SupplyClosureSummary } from '../../../domain/entities/supply-day-closure'
import type { SupplyType } from '../../../domain/entities/supply-transfer'
import type { SupplyTransferReport } from '../../../domain/entities/supply-transfer-report'
import { computeStatus, worstStatus } from '../../../domain/entities/supply-transfer-report'

type RawClosure = {
  id: string
  branch_id: string
  closure_date: Date
  supply_type: string
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

export class PrismaSupplyDayClosureRepository implements ISupplyDayClosureRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async getSummary(branchId: string, closureDate: Date): Promise<SupplyClosureSummary[]> {
    type RawSummary = { supply_type: string; initial_count: unknown; wastage_count: unknown }

    const rows = await this.db.$queryRawUnsafe<RawSummary[]>(
      `SELECT
         dti.supply_type,
         COALESCE(SUM(dti.quantity_received), 0) AS initial_count,
         COALESCE((
           SELECT SUM(dw.quantity)
           FROM "${this.schema}".supply_wastages dw
           WHERE dw.branch_id = $1
             AND DATE(dw.recorded_at) = $2::date
             AND dw.supply_type = dti.supply_type
         ), 0) AS wastage_count
       FROM "${this.schema}".supply_transfer_items dti
       JOIN "${this.schema}".supply_transfers dt ON dt.id = dti.transfer_id
       WHERE dt.to_branch_id = $1
         AND dt.transfer_date = $2::date
         AND dt.status = 'RECEIVED'
         AND dti.quantity_received IS NOT NULL
       GROUP BY dti.supply_type`,
      branchId, closureDate,
    )

    return rows.map(r => ({
      supplyType: r.supply_type as SupplyType,
      initialCount: Number(r.initial_count),
      wastageCount: Number(r.wastage_count),
    }))
  }

  async create(data: CreateSupplyDayClosureData): Promise<SupplyDayClosure> {
    // Compute initial_count and wastage_count from DB
    type RawCount = { initial_count: unknown; wastage_count: unknown }
    const counts = await this.db.$queryRawUnsafe<RawCount[]>(
      `SELECT
         COALESCE((
           SELECT SUM(dti.quantity_received)
           FROM "${this.schema}".supply_transfer_items dti
           JOIN "${this.schema}".supply_transfers dt ON dt.id = dti.transfer_id
           WHERE dt.to_branch_id = $1
             AND dt.transfer_date = $2::date
             AND dt.status = 'RECEIVED'
             AND dti.supply_type = $3
             AND dti.quantity_received IS NOT NULL
         ), 0) AS initial_count,
         COALESCE((
           SELECT SUM(dw.quantity)
           FROM "${this.schema}".supply_wastages dw
           WHERE dw.branch_id = $1
             AND DATE(dw.recorded_at) = $2::date
             AND dw.supply_type = $3
         ), 0) AS wastage_count`,
      data.branchId, data.closureDate, data.supplyType,
    )

    const initialCount = Number(counts[0].initial_count)
    const wastageCount = Number(counts[0].wastage_count)
    const theoreticalRemaining = initialCount - data.soldCount - wastageCount
    const difference = data.actualRemaining - theoreticalRemaining

    const rows = await this.db.$queryRawUnsafe<RawClosure[]>(
      `INSERT INTO "${this.schema}".supply_day_closures
         (branch_id, closure_date, supply_type, initial_count, sold_count, wastage_count,
          theoretical_remaining, actual_remaining, difference, notes, closed_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      data.branchId, data.closureDate, data.supplyType,
      initialCount, data.soldCount, wastageCount,
      theoreticalRemaining, data.actualRemaining, difference,
      data.notes, data.closedByUserId,
    )
    return this.toEntity(rows[0])
  }

  async findByBranchAndDate(branchId: string, closureDate: Date, supplyType: SupplyType): Promise<SupplyDayClosure | null> {
    const rows = await this.db.$queryRawUnsafe<RawClosure[]>(
      `SELECT * FROM "${this.schema}".supply_day_closures
       WHERE branch_id = $1 AND closure_date = $2::date AND supply_type = $3`,
      branchId, closureDate, supplyType,
    )
    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async list(branchId: string, from?: Date, to?: Date): Promise<SupplyDayClosure[]> {
    const rows = await this.db.$queryRawUnsafe<RawClosure[]>(
      `SELECT * FROM "${this.schema}".supply_day_closures
       WHERE branch_id = $1
         AND ($2::date IS NULL OR closure_date >= $2)
         AND ($3::date IS NULL OR closure_date <= $3)
       ORDER BY closure_date DESC, supply_type`,
      branchId, from ?? null, to ?? null,
    )
    return rows.map(r => this.toEntity(r))
  }

  async getReport(opts: ReportOpts): Promise<SupplyTransferReport[]> {
    const rows = await this.db.$queryRawUnsafe<RawClosure[]>(
      `SELECT * FROM "${this.schema}".supply_day_closures
       WHERE ($1::text IS NULL OR branch_id = $1)
         AND ($2::date IS NULL OR closure_date >= $2)
         AND ($3::date IS NULL OR closure_date <= $3)
       ORDER BY closure_date DESC, branch_id, supply_type`,
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

    const reports: SupplyTransferReport[] = []
    for (const [key, group] of grouped) {
      const [branchId, date] = key.split('|')
      const supplyTypes = group.map(row => {
        const difference = Number(row.difference)
        return {
          supplyType: row.supply_type as SupplyType,
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
        supplyTypes,
        overallStatus: worstStatus(supplyTypes.map(d => d.status)),
      })
    }

    return reports
  }

  private toEntity(raw: RawClosure): SupplyDayClosure {
    return {
      id: raw.id,
      branchId: raw.branch_id,
      closureDate: raw.closure_date,
      supplyType: raw.supply_type as SupplyType,
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
