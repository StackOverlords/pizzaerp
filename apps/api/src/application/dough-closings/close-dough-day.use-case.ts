import type { IDoughDayClosureRepository } from '../../domain/repositories/i-dough-day-closure-repository'
import type { DoughDayClosure } from '../../domain/entities/dough-day-closure'
import type { DoughType } from '../../domain/entities/dough-transfer'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  doughDayClosureRepository: IDoughDayClosureRepository
}

interface CloseDoughDayInput {
  branchId: string
  closedByUserId: string
  closureDate: string
  doughType: string
  soldCount: number
  actualRemaining: number
  notes?: string | null
}

const VALID_DOUGH_TYPES = ['SMALL', 'MEDIUM', 'LARGE']

export function createCloseDoughDayUseCase({ doughDayClosureRepository }: Dependencies) {
  return async function closeDoughDay(input: CloseDoughDayInput): Promise<DoughDayClosure> {
    if (!VALID_DOUGH_TYPES.includes(input.doughType)) {
      throw Errors.badRequest(`Tipo de masa inválido. Válidos: ${VALID_DOUGH_TYPES.join(', ')}`)
    }
    if (input.soldCount < 0) throw Errors.badRequest('La cantidad vendida no puede ser negativa')
    if (input.actualRemaining < 0) throw Errors.badRequest('El conteo físico no puede ser negativo')

    const closureDate = new Date(input.closureDate)
    const doughType = input.doughType as DoughType

    const existing = await doughDayClosureRepository.findByBranchAndDate(input.branchId, closureDate, doughType)
    if (existing) {
      throw Errors.conflict(`Ya existe un cierre para ${doughType} en la fecha ${input.closureDate}`)
    }

    // Pre-calculate to validate notes requirement before writing
    const summary = await doughDayClosureRepository.getSummary(input.branchId, closureDate)
    const typeSummary = summary.find(s => s.doughType === doughType)
    const initialCount = typeSummary?.initialCount ?? 0
    const wastageCount = typeSummary?.wastageCount ?? 0
    const theoreticalRemaining = initialCount - input.soldCount - wastageCount
    const difference = input.actualRemaining - theoreticalRemaining

    if (difference !== 0 && !input.notes) {
      throw Errors.badRequest('Se requiere una observación cuando hay diferencia entre el conteo físico y el teórico')
    }

    return doughDayClosureRepository.create({
      branchId: input.branchId,
      closureDate,
      doughType,
      soldCount: input.soldCount,
      actualRemaining: input.actualRemaining,
      notes: input.notes ?? null,
      closedByUserId: input.closedByUserId,
    })
  }
}
