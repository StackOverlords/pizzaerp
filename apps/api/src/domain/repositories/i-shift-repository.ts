import type { Shift } from '../entities/shift'
import type { ShiftSalesSummary } from '../entities/shift-closure'

export interface OpenShiftData {
  branchId: string
  userId: string
  initialCash: number
}

export interface IShiftRepository {
  findOpenByUser(userId: string, branchId: string): Promise<Shift | null>
  findById(id: string): Promise<Shift | null>
  open(data: OpenShiftData): Promise<Shift>
  close(id: string): Promise<Shift>
  getSalesSummary(shiftId: string): Promise<ShiftSalesSummary>
}
