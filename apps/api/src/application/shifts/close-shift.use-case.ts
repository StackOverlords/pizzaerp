import type { IShiftRepository } from '../../domain/repositories/i-shift-repository'
import type { IShiftClosureRepository } from '../../domain/repositories/i-shift-closure-repository'
import type { Shift } from '../../domain/entities/shift'
import type { ShiftClosure } from '../../domain/entities/shift-closure'
import { ShiftStatus } from '../../domain/entities/shift'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  shiftRepository: IShiftRepository
  shiftClosureRepository: IShiftClosureRepository
}

export interface CloseShiftInput {
  userId: string
  branchId: string
  declaredCash: number
  declaredQrCount: number
  notes?: string
}

export interface CloseShiftResult {
  shift: Shift
  closure: ShiftClosure
}

export function createCloseShiftUseCase({ shiftRepository, shiftClosureRepository }: Dependencies) {
  return async function closeShift(input: CloseShiftInput): Promise<CloseShiftResult> {
    if (input.declaredCash < 0) throw Errors.badRequest('declaredCash must be >= 0')
    if (input.declaredQrCount < 0) throw Errors.badRequest('declaredQrCount must be >= 0')

    const openShift = await shiftRepository.findOpenByUser(input.userId, input.branchId)
    if (!openShift) throw Errors.conflict('No hay turno abierto para cerrar')
    if (openShift.status !== ShiftStatus.OPEN) {
      throw Errors.conflict('El turno ya está cerrado')
    }

    // Calculate expected totals from DB — happens AFTER receiving declared values (cierre ciego)
    const summary = await shiftRepository.getSalesSummary(openShift.id)

    const expectedCash = parseFloat((openShift.initialCash + summary.cashFromSales).toFixed(2))
    const expectedQrTotal = parseFloat(summary.qrTotal.toFixed(2))
    const expectedQrCount = summary.qrCount
    const cashDifference = parseFloat((input.declaredCash - expectedCash).toFixed(2))
    const qrCountDifference = input.declaredQrCount - expectedQrCount

    const hasDifference = cashDifference !== 0 || qrCountDifference !== 0
    if (hasDifference && !input.notes?.trim()) {
      throw Errors.badRequest('Se requiere una observación cuando hay diferencia en el cuadre')
    }

    const shift = await shiftRepository.close(openShift.id)
    const closure = await shiftClosureRepository.create({
      shiftId: openShift.id,
      declaredCash: input.declaredCash,
      declaredQrCount: input.declaredQrCount,
      expectedCash,
      expectedQrTotal,
      expectedQrCount,
      cashDifference,
      qrCountDifference,
      notes: input.notes,
    })

    return { shift, closure }
  }
}
