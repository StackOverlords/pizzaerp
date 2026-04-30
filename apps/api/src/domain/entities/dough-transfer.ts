export const DoughType = { SMALL: 'SMALL', MEDIUM: 'MEDIUM', LARGE: 'LARGE' } as const
export type DoughType = (typeof DoughType)[keyof typeof DoughType]

export const DoughTransferStatus = { IN_TRANSIT: 'IN_TRANSIT', RECEIVED: 'RECEIVED' } as const
export type DoughTransferStatus = (typeof DoughTransferStatus)[keyof typeof DoughTransferStatus]

export interface DoughTransferItem {
  id: string
  transferId: string
  doughType: DoughType
  quantitySent: number
  quantityReceived: number | null
  notes: string | null
}

export interface DoughTransfer {
  id: string
  fromBranchId: string
  toBranchId: string
  sentByUserId: string
  status: DoughTransferStatus
  transferDate: Date
  notes: string | null
  sentAt: Date
  receivedAt: Date | null
}

export interface DoughTransferWithItems extends DoughTransfer {
  items: DoughTransferItem[]
}
