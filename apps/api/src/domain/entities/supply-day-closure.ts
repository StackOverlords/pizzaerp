import type { SupplyType } from './supply-transfer'

export interface SupplyDayClosure {
  id: string
  branchId: string
  closureDate: Date
  supplyType: SupplyType
  initialCount: number
  soldCount: number
  wastageCount: number
  theoreticalRemaining: number
  actualRemaining: number
  difference: number
  notes: string | null
  closedByUserId: string
  closedAt: Date
}

export interface SupplyClosureSummary {
  supplyType: SupplyType
  initialCount: number
  wastageCount: number
}
