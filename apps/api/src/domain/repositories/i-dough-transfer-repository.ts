import type { DoughTransfer, DoughTransferStatus, DoughTransferWithItems, DoughType } from '../entities/dough-transfer'

export interface CreateDoughTransferData {
  fromBranchId: string
  toBranchId: string
  sentByUserId: string
  transferDate: Date
  notes: string | null
  items: {
    doughType: DoughType
    quantitySent: number
    notes: string | null
  }[]
}

export interface ListDoughTransfersOpts {
  branchId: string
  status?: DoughTransferStatus
  from?: Date
  to?: Date
}

export interface ReceiveItemData {
  doughType: DoughType
  quantityReceived: number
  notes: string | null
}

export interface IDoughTransferRepository {
  create(data: CreateDoughTransferData): Promise<DoughTransferWithItems>
  findById(id: string): Promise<DoughTransferWithItems | null>
  list(opts: ListDoughTransfersOpts): Promise<DoughTransferWithItems[]>
  updateStatus(id: string, status: DoughTransferStatus, receivedAt: Date): Promise<DoughTransfer>
  receive(id: string, items: ReceiveItemData[], notes: string | null): Promise<DoughTransferWithItems>
}
