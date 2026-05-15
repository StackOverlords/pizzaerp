export const CashMovementType = {
  INGRESO: 'INGRESO',
  RETIRO:  'RETIRO',
} as const
export type CashMovementType = (typeof CashMovementType)[keyof typeof CashMovementType]

export interface CashMovement {
  id: string
  shiftId: string
  type: CashMovementType
  amount: number
  reason: string
  createdByUserId: string
  createdAt: Date
}

export interface CashMovementSummary {
  ingresoTotal: number
  retiroTotal: number
}
