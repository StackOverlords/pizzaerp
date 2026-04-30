import type { IDoughWastageRepository } from '../../domain/repositories/i-dough-wastage-repository'
import type { DoughWastage, WastageReason } from '../../domain/entities/dough-wastage'
import type { DoughType } from '../../domain/entities/dough-transfer'
import { Errors } from '../../shared/errors/app-error'

const VALID_REASONS = ['FELL', 'BAD_SHAPE', 'BURNED', 'CONTAMINATED', 'OTHER']
const VALID_DOUGH_TYPES = ['SMALL', 'MEDIUM', 'LARGE']

interface Dependencies {
  doughWastageRepository: IDoughWastageRepository
}

interface CreateWastageInput {
  branchId: string
  userId: string
  doughType: string
  quantity: number
  reason: string
  notes?: string | null
}

export function createCreateDoughWastageUseCase({ doughWastageRepository }: Dependencies) {
  return async function createDoughWastage(input: CreateWastageInput): Promise<DoughWastage> {
    if (!VALID_DOUGH_TYPES.includes(input.doughType)) {
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

    return doughWastageRepository.create({
      branchId: input.branchId,
      userId: input.userId,
      doughType: input.doughType as DoughType,
      quantity: input.quantity,
      reason: input.reason as WastageReason,
      notes: input.notes ?? null,
    })
  }
}
