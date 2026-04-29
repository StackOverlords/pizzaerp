export interface ShiftClosure {
  id: string
  shiftId: string
  declaredCash: number
  declaredQrCount: number
  expectedCash: number
  expectedQrTotal: number
  expectedQrCount: number
  cashDifference: number
  qrCountDifference: number
  notes: string | null
  closedAt: Date
}

export interface ShiftSalesSummary {
  cashFromSales: number
  qrTotal: number
  qrCount: number
}
