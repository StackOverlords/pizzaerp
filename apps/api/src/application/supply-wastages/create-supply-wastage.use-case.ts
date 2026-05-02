import type { ISupplyWastageRepository } from '../../domain/repositories/i-supply-wastage-repository'
import type { ISupplyTypeRepository } from '../../domain/repositories/i-supply-type-repository'
import type { SupplyWastage, WastageReason } from '../../domain/entities/supply-wastage'
import { Errors } from '../../shared/errors/app-error'

const VALID_REASONS = ['FELL', 'BAD_SHAPE', 'BURNED', 'CONTAMINATED', 'OTHER']

interface Dependencies {
  supplyWastageRepository: ISupplyWastageRepository
  supplyTypeRepository: ISupplyTypeRepository
}

interface CreateWastageInput {
  branchId: string
  userId: string
  supplyType: string
  quantity: number
  reason: string
  notes?: string | null
}

export function createCreateSupplyWastageUseCase({ supplyWastageRepository, supplyTypeRepository }: Dependencies) {
  return async function createSupplyWastage(input: CreateWastageInput): Promise<SupplyWastage> {
    const supplyType = await supplyTypeRepository.findByName(input.supplyType)
    if (!supplyType || !supplyType.active) {
      throw Errors.badRequest(`Tipo de insumo inválido: "${input.supplyType}"`)
    }
    if (!VALID_REASONS.includes(input.reason)) {
      throw Errors.badRequest(`Motivo inválido. Válidos: ${VALID_REASONS.join(', ')}`)
    }
    if (input.quantity <= 0) {
      throw Errors.badRequest('La cantidad debe ser mayor a 0')
    }
    if (input.reason === 'OTHER' && !input.notes) {
      throw Errors.badRequest('Se requiere una nota cuando el motivo es "otro"')
    }

    return supplyWastageRepository.create({
      branchId: input.branchId,
      userId: input.userId,
      supplyType: input.supplyType,
      quantity: input.quantity,
      reason: input.reason as WastageReason,
      notes: input.notes ?? null,
    })
  }
}
