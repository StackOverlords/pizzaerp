import type { Shift, ShiftWithClosure } from '../entities/shift'
import type { ShiftSalesSummary } from '../entities/shift-closure'

export interface OpenShiftData {
  branchId: string
  userId: string
  initialCash: number
}

export interface FindClosedOpts {
  page: number
  limit: number
  from?: Date
  to?: Date
}

export interface IShiftRepository {
  findOpenByUser(userId: string, branchId: string): Promise<Shift | null>
  findById(id: string): Promise<Shift | null>
  open(data: OpenShiftData): Promise<Shift>
  close(id: string): Promise<Shift>
  getSalesSummary(shiftId: string): Promise<ShiftSalesSummary>
  findClosed(branchId: string, opts: FindClosedOpts): Promise<{ data: ShiftWithClosure[]; total: number }>
}
