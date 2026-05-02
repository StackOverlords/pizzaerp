import type { ISupplyTypeRepository } from '../../domain/repositories/i-supply-type-repository'
import type { SupplyType } from '../../domain/entities/supply-type'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  supplyTypeRepository: ISupplyTypeRepository
}

interface UpdateSupplyTypeInput {
  id: string
  name: string
}

export function createUpdateSupplyTypeUseCase({ supplyTypeRepository }: Dependencies) {
  return async function updateSupplyType(input: UpdateSupplyTypeInput): Promise<SupplyType> {
    if (!input.name.trim()) throw Errors.badRequest('El nombre del tipo de insumo es requerido')

    const current = await supplyTypeRepository.findById(input.id)
    if (!current) throw Errors.notFound('Tipo de insumo no encontrado')

    const duplicate = await supplyTypeRepository.findByName(input.name)
    if (duplicate && duplicate.id !== input.id) {
      throw Errors.conflict(`Ya existe un tipo de insumo con el nombre "${input.name}"`)
    }

    return supplyTypeRepository.update(input.id, { name: input.name.trim() })
  }
}
