import type { IDoughWastageRepository, ListDoughWastagesOpts } from '../../domain/repositories/i-dough-wastage-repository'
import type { DoughWastage } from '../../domain/entities/dough-wastage'

interface Dependencies {
  doughWastageRepository: IDoughWastageRepository
}

export function createListDoughWastagesUseCase({ doughWastageRepository }: Dependencies) {
  return async function listDoughWastages(opts: ListDoughWastagesOpts): Promise<DoughWastage[]> {
    return doughWastageRepository.list(opts)
  }
}
