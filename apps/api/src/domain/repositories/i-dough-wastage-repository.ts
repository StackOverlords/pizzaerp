import type { DoughWastage } from '../entities/dough-wastage'
import type { DoughType } from '../entities/dough-transfer'
import type { WastageReason } from '../entities/dough-wastage'

export interface CreateDoughWastageData {
  branchId: string
  userId: string
  doughType: DoughType
  quantity: number
  reason: WastageReason
  notes: string | null
}

export interface ListDoughWastagesOpts {
  branchId: string
  from?: Date
  to?: Date
}

export interface IDoughWastageRepository {
  create(data: CreateDoughWastageData): Promise<DoughWastage>
  list(opts: ListDoughWastagesOpts): Promise<DoughWastage[]>
}
