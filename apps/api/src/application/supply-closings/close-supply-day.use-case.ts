import type { ISupplyDayClosureRepository } from '../../domain/repositories/i-supply-day-closure-repository'
import type { SupplyDayClosure } from '../../domain/entities/supply-day-closure'
import type { SupplyType } from '../../domain/entities/supply-transfer'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  supplyDayClosureRepository: ISupplyDayClosureRepository
}

interface CloseDoughDayInput {
  branchId: string
  closedByUserId: string
  closureDate: string
  supplyType: string
  soldCount: number
  actualRemaining: number
  notes?: string | null
}

const VALID_DOUGH_TYPES = ['SMALL', 'MEDIUM', 'LARGE']

export function createCloseSupplyDayUseCase({ supplyDayClosureRepository }: Dependencies) {
  return async function closeSupplyDay(input: CloseDoughDayInput): Promise<SupplyDayClosure> {
    if (!VALID_DOUGH_TYPES.includes(input.supplyType)) {
      throw Errors.badRequest(`Tipo de masa inválido. Válidos: ${VALID_DOUGH_TYPES.join(', ')}`)
    }
    if (input.soldCount < 0) throw Errors.badRequest('La cantidad vendida no puede ser negativa')
    if (input.actualRemaining < 0) throw Errors.badRequest('El conteo físico no puede ser negativo')

    const closureDate = new Date(input.closureDate)
    const supplyType = input.supplyType as SupplyType

    const existing = await supplyDayClosureRepository.findByBranchAndDate(input.branchId, closureDate, supplyType)
    if (existing) {
      throw Errors.conflict(`Ya existe un cierre para ${supplyType} en la fecha ${input.closureDate}`)
    }

    // Pre-calculate to validate notes requirement before writing
    const summary = await supplyDayClosureRepository.getSummary(input.branchId, closureDate)
    const typeSummary = summary.find(s => s.supplyType === supplyType)
    const initialCount = typeSummary?.initialCount ?? 0
    const wastageCount = typeSummary?.wastageCount ?? 0
    const theoreticalRemaining = initialCount - input.soldCount - wastageCount
    const difference = input.actualRemaining - theoreticalRemaining

    if (difference !== 0 && !input.notes) {
      throw Errors.badRequest('Se requiere una observación cuando hay diferencia entre el conteo físico y el teórico')
    }

    return supplyDayClosureRepository.create({
      branchId: input.branchId,
      closureDate,
      supplyType,
      soldCount: input.soldCount,
      actualRemaining: input.actualRemaining,
      notes: input.notes ?? null,
      closedByUserId: input.closedByUserId,
    })
  }
}
