import type { ISupplyWastageRepository } from '../../domain/repositories/i-supply-wastage-repository'
import type { SupplyWastage, WastageReason } from '../../domain/entities/supply-wastage'
import type { SupplyType } from '../../domain/entities/supply-transfer'
import { Errors } from '../../shared/errors/app-error'

const VALID_REASONS = ['FELL', 'BAD_SHAPE', 'BURNED', 'CONTAMINATED', 'OTHER']
const VALID_DOUGH_TYPES = ['SMALL', 'MEDIUM', 'LARGE']

interface Dependencies {
  supplyWastageRepository: ISupplyWastageRepository
}

interface CreateWastageInput {
  branchId: string
  userId: string
  supplyType: string
  quantity: number
  reason: string
  notes?: string | null
}

export function createCreateSupplyWastageUseCase({ supplyWastageRepository }: Dependencies) {
  return async function createSupplyWastage(input: CreateWastageInput): Promise<SupplyWastage> {
    if (!VALID_DOUGH_TYPES.includes(input.supplyType)) {
      throw Errors.badRequest(`Tipo de masa inválido. Válidos: ${VALID_DOUGH_TYPES.join(', ')}`)
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
      supplyType: input.supplyType as SupplyType,
      quantity: input.quantity,
      reason: input.reason as WastageReason,
      notes: input.notes ?? null,
    })
  }
}
