import type { PrismaClient } from '@prisma/client'
import type { IShiftRepository, OpenShiftData } from '../../../domain/repositories/i-shift-repository'
import type { Shift } from '../../../domain/entities/shift'
import type { ShiftStatus } from '../../../domain/entities/shift'

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
