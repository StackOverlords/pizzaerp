import type { ShiftClosure } from './shift-closure'

export const ShiftStatus = { OPEN: 'OPEN', CLOSED: 'CLOSED' } as const
export type ShiftStatus = (typeof ShiftStatus)[keyof typeof ShiftStatus]

export interface Shift {
  id: string
  branchId: string
  userId: string
  openedAt: Date
  closedAt: Date | null
  initialCash: number
  status: ShiftStatus
}

export interface ShiftWithClosure extends Shift {
  closure: ShiftClosure | null
}
