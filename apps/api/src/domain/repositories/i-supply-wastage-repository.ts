import type { SupplyWastage } from '../entities/supply-wastage'
import type { SupplyType } from '../entities/supply-transfer'
import type { WastageReason } from '../entities/supply-wastage'

export interface CreateSupplyWastageData {
  branchId: string
  userId: string
  supplyType: SupplyType
  quantity: number
  reason: WastageReason
  notes: string | null
}

export interface ListSupplyWastagesOpts {
  branchId: string
  from?: Date
  to?: Date
}

export interface ISupplyWastageRepository {
  create(data: CreateSupplyWastageData): Promise<SupplyWastage>
  list(opts: ListSupplyWastagesOpts): Promise<SupplyWastage[]>
}
