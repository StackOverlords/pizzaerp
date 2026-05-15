import type { CashMovement, CashMovementSummary, CashMovementType } from '../entities/cash-movement'

export interface CreateCashMovementData {
  shiftId: string
  type: CashMovementType
  amount: number
  reason: string
  createdByUserId: string
}

export interface ICashMovementRepository {
  create(data: CreateCashMovementData): Promise<CashMovement>
  listByShift(shiftId: string): Promise<CashMovement[]>
  getSummaryForShift(shiftId: string): Promise<CashMovementSummary>
}
