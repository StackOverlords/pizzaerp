export const WastageReason = {
  FELL:         'FELL',
  BAD_SHAPE:    'BAD_SHAPE',
  BURNED:       'BURNED',
  CONTAMINATED: 'CONTAMINATED',
  OTHER:        'OTHER',
} as const
export type WastageReason = (typeof WastageReason)[keyof typeof WastageReason]

export interface DoughWastage {
  id: string
  branchId: string
  userId: string
  doughType: string
  quantity: number
  reason: WastageReason
  notes: string | null
  recordedAt: Date
}
