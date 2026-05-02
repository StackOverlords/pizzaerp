import type { SupplyDayClosure, SupplyClosureSummary } from '../entities/supply-day-closure'
import type { SupplyTransferReport } from '../entities/supply-transfer-report'

export interface CreateSupplyDayClosureData {
  branchId: string
  closureDate: Date
  supplyType: string
  soldCount: number
  actualRemaining: number
  notes: string | null
  closedByUserId: string
}

export interface ReportOpts {
  branchId?: string
  from?: Date
  to?: Date
}

export interface ISupplyDayClosureRepository {
  create(data: CreateSupplyDayClosureData): Promise<SupplyDayClosure>
  findByBranchAndDate(branchId: string, closureDate: Date, supplyType: string): Promise<SupplyDayClosure | null>
  list(branchId: string, from?: Date, to?: Date): Promise<SupplyDayClosure[]>
  getSummary(branchId: string, closureDate: Date): Promise<SupplyClosureSummary[]>
  getReport(opts: ReportOpts): Promise<SupplyTransferReport[]>
}
