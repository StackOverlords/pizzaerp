import type { ISupplyTypeRepository } from '../../domain/repositories/i-supply-type-repository'
import type { SupplyType } from '../../domain/entities/supply-type'

interface Dependencies {
  supplyTypeRepository: ISupplyTypeRepository
}

export function createListSupplyTypesUseCase({ supplyTypeRepository }: Dependencies) {
  return async function listSupplyTypes(): Promise<SupplyType[]> {
    return supplyTypeRepository.list()
  }
}
