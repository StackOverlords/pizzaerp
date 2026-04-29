import type { ShiftClosure } from '../entities/shift-closure'

export interface CreateShiftClosureData {
  shiftId: string
  declaredCash: number
  declaredQrCount: number
  expectedCash: number
  expectedQrTotal: number
  expectedQrCount: number
  cashDifference: number
  qrCountDifference: number
  notes?: string
}

export interface IShiftClosureRepository {
  create(data: CreateShiftClosureData): Promise<ShiftClosure>
  findByShiftId(shiftId: string): Promise<ShiftClosure | null>
}
