import type { ISupplyTypeRepository } from '../../domain/repositories/i-supply-type-repository'
import type { SupplyType } from '../../domain/entities/supply-type'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  supplyTypeRepository: ISupplyTypeRepository
}

interface CreateSupplyTypeInput {
  name: string
}

export function createCreateSupplyTypeUseCase({ supplyTypeRepository }: Dependencies) {
  return async function createSupplyType(input: CreateSupplyTypeInput): Promise<SupplyType> {
    if (!input.name.trim()) throw Errors.badRequest('El nombre del tipo de insumo es requerido')

    const existing = await supplyTypeRepository.findByName(input.name)
    if (existing) throw Errors.conflict(`Ya existe un tipo de insumo con el nombre "${input.name}"`)

    return supplyTypeRepository.create({ name: input.name.trim() })
  }
}
