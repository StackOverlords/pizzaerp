import type { DoughType } from './dough-transfer'

export interface DoughDayClosure {
  id: string
  branchId: string
  closureDate: Date
  doughType: DoughType
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

export interface DoughClosureSummary {
  doughType: DoughType
  initialCount: number
  wastageCount: number
}
