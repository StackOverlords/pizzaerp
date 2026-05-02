import type { ISupplyTransferRepository, ListSupplyTransfersOpts } from '../../domain/repositories/i-supply-transfer-repository'
import type { SupplyTransferStatus } from '../../domain/entities/supply-transfer'
import type { SupplyTransferWithItems } from '../../domain/entities/supply-transfer'

interface Dependencies {
  supplyTransferRepository: ISupplyTransferRepository
}

interface ListInput {
  branchId: string
  status?: SupplyTransferStatus
  from?: Date
  to?: Date
}

export function createListSupplyTransfersUseCase({ supplyTransferRepository }: Dependencies) {
  return async function listSupplyTransfers(input: ListInput): Promise<SupplyTransferWithItems[]> {
    const opts: ListSupplyTransfersOpts = {
      branchId: input.branchId,
      status: input.status,
      from: input.from,
      to: input.to,
    }
    return supplyTransferRepository.list(opts)
  }
}
