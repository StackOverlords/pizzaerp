import type { SupplyTransfer, SupplyTransferStatus, SupplyTransferWithItems } from '../entities/supply-transfer'

export interface CreateSupplyTransferData {
  fromBranchId: string
  toBranchId: string
  sentByUserId: string
  transferDate: Date
  notes: string | null
  items: {
    supplyType: string
    quantitySent: number
    notes: string | null
  }[]
}

export interface ListSupplyTransfersOpts {
  branchId: string
  status?: SupplyTransferStatus
  from?: Date
  to?: Date
}

export interface ReceiveItemData {
  supplyType: string
  quantityReceived: number
  notes: string | null
}

export interface ISupplyTransferRepository {
  create(data: CreateSupplyTransferData): Promise<SupplyTransferWithItems>
  findById(id: string): Promise<SupplyTransferWithItems | null>
  list(opts: ListSupplyTransfersOpts): Promise<SupplyTransferWithItems[]>
  updateStatus(id: string, status: SupplyTransferStatus, receivedAt: Date): Promise<SupplyTransfer>
  receive(id: string, items: ReceiveItemData[], notes: string | null): Promise<SupplyTransferWithItems>
}
