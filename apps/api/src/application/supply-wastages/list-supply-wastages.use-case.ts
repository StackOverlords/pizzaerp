import type { ISupplyWastageRepository, ListSupplyWastagesOpts } from '../../domain/repositories/i-supply-wastage-repository'
import type { SupplyWastage } from '../../domain/entities/supply-wastage'

interface Dependencies {
  supplyWastageRepository: ISupplyWastageRepository
}

export function createListSupplyWastagesUseCase({ supplyWastageRepository }: Dependencies) {
  return async function listSupplyWastages(opts: ListSupplyWastagesOpts): Promise<SupplyWastage[]> {
    return supplyWastageRepository.list(opts)
  }
}
