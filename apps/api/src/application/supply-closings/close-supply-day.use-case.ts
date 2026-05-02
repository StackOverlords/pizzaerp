import type { ISupplyDayClosureRepository } from '../../domain/repositories/i-supply-day-closure-repository'
import type { ISupplyTypeRepository } from '../../domain/repositories/i-supply-type-repository'
import type { SupplyDayClosure } from '../../domain/entities/supply-day-closure'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  supplyDayClosureRepository: ISupplyDayClosureRepository
  supplyTypeRepository: ISupplyTypeRepository
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

export function createCloseSupplyDayUseCase({ supplyDayClosureRepository, supplyTypeRepository }: Dependencies) {
  return async function closeSupplyDay(input: CloseDoughDayInput): Promise<SupplyDayClosure> {
    const supplyType = await supplyTypeRepository.findByName(input.supplyType)
    if (!supplyType || !supplyType.active) {
      throw Errors.badRequest(`Tipo de insumo inválido: "${input.supplyType}"`)
    }
    if (input.soldCount < 0) throw Errors.badRequest('La cantidad vendida no puede ser negativa')
    if (input.actualRemaining < 0) throw Errors.badRequest('El conteo físico no puede ser negativo')

    const closureDate = new Date(input.closureDate)

    const existing = await supplyDayClosureRepository.findByBranchAndDate(input.branchId, closureDate, input.supplyType)
    if (existing) {
      throw Errors.conflict(`Ya existe un cierre para ${input.supplyType} en la fecha ${input.closureDate}`)
    }

    const summary = await supplyDayClosureRepository.getSummary(input.branchId, closureDate)
    const typeSummary = summary.find(s => s.supplyType === input.supplyType)
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
      supplyType: input.supplyType,
      soldCount: input.soldCount,
      actualRemaining: input.actualRemaining,
      notes: input.notes ?? null,
      closedByUserId: input.closedByUserId,
    })
  }
}
