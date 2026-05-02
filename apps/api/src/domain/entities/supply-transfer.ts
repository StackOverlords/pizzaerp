export const SupplyType = { SMALL: 'SMALL', MEDIUM: 'MEDIUM', LARGE: 'LARGE' } as const
export type SupplyType = (typeof SupplyType)[keyof typeof SupplyType]

export const SupplyTransferStatus = { IN_TRANSIT: 'IN_TRANSIT', RECEIVED: 'RECEIVED' } as const
export type SupplyTransferStatus = (typeof SupplyTransferStatus)[keyof typeof SupplyTransferStatus]

export interface SupplyTransferItem {
  id: string
  transferId: string
  supplyType: SupplyType
  quantitySent: number
  quantityReceived: number | null
  notes: string | null
}

export interface SupplyTransfer {
  id: string
  fromBranchId: string
  toBranchId: string
  sentByUserId: string
  status: SupplyTransferStatus
  transferDate: Date
  notes: string | null
  sentAt: Date
  receivedAt: Date | null
}

export interface SupplyTransferWithItems extends SupplyTransfer {
  items: SupplyTransferItem[]
}
