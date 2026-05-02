import type { PrismaClient } from '@prisma/client'
import type { ISupplyWastageRepository, CreateSupplyWastageData, ListSupplyWastagesOpts } from '../../../domain/repositories/i-supply-wastage-repository'
import type { SupplyWastage, WastageReason } from '../../../domain/entities/supply-wastage'

type RawWastage = {
  id: string
  branch_id: string
  user_id: string
  supply_type: string
  quantity: number | bigint
  reason: string
  notes: string | null
  recorded_at: Date
}

export class PrismaSupplyWastageRepository implements ISupplyWastageRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async create(data: CreateSupplyWastageData): Promise<SupplyWastage> {
    const rows = await this.db.$queryRawUnsafe<RawWastage[]>(
      `INSERT INTO "${this.schema}".supply_wastages
         (branch_id, user_id, supply_type, quantity, reason, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      data.branchId, data.userId, data.supplyType, data.quantity, data.reason, data.notes,
    )
    return this.toEntity(rows[0])
  }

  async list(opts: ListSupplyWastagesOpts): Promise<SupplyWastage[]> {
    const from = opts.from ?? null
    const to = opts.to ?? null

    const rows = await this.db.$queryRawUnsafe<RawWastage[]>(
      `SELECT * FROM "${this.schema}".supply_wastages
       WHERE branch_id = $1
         AND ($2::timestamptz IS NULL OR recorded_at >= $2)
         AND ($3::timestamptz IS NULL OR recorded_at <= $3)
       ORDER BY recorded_at DESC`,
      opts.branchId, from, to,
    )
    return rows.map(r => this.toEntity(r))
  }

  private toEntity(raw: RawWastage): SupplyWastage {
    return {
      id: raw.id,
      branchId: raw.branch_id,
      userId: raw.user_id,
      supplyType: raw.supply_type,
      quantity: Number(raw.quantity),
      reason: raw.reason as WastageReason,
      notes: raw.notes,
      recordedAt: raw.recorded_at,
    }
  }
}
