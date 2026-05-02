export interface SupplyDayClosure {
  id: string
  branchId: string
  closureDate: Date
  supplyType: string
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
  supplyType: string
  initialCount: number
  wastageCount: number
}
