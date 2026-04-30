import type { DoughDayClosure, DoughClosureSummary } from '../entities/dough-day-closure'
import type { DoughType } from '../entities/dough-transfer'

export interface CreateDoughDayClosureData {
  branchId: string
  closureDate: Date
  doughType: DoughType
  soldCount: number
  actualRemaining: number
  notes: string | null
  closedByUserId: string
}

export interface IDoughDayClosureRepository {
  create(data: CreateDoughDayClosureData): Promise<DoughDayClosure>
  findByBranchAndDate(branchId: string, closureDate: Date, doughType: DoughType): Promise<DoughDayClosure | null>
  list(branchId: string, from?: Date, to?: Date): Promise<DoughDayClosure[]>
  getSummary(branchId: string, closureDate: Date): Promise<DoughClosureSummary[]>
}
