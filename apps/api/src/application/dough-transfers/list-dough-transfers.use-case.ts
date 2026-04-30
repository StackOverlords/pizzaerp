import type { IDoughTransferRepository, ListDoughTransfersOpts } from '../../domain/repositories/i-dough-transfer-repository'
import type { DoughTransferStatus } from '../../domain/entities/dough-transfer'
import type { DoughTransferWithItems } from '../../domain/entities/dough-transfer'

interface Dependencies {
  doughTransferRepository: IDoughTransferRepository
}

interface ListInput {
  branchId: string
  status?: DoughTransferStatus
  from?: Date
  to?: Date
}

export function createListDoughTransfersUseCase({ doughTransferRepository }: Dependencies) {
  return async function listDoughTransfers(input: ListInput): Promise<DoughTransferWithItems[]> {
    const opts: ListDoughTransfersOpts = {
      branchId: input.branchId,
      status: input.status,
      from: input.from,
      to: input.to,
    }
    return doughTransferRepository.list(opts)
  }
}
