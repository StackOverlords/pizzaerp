import type { IShiftRepository, OpenShiftData } from '../../domain/repositories/i-shift-repository'
import type { Shift } from '../../domain/entities/shift'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  shiftRepository: IShiftRepository
}

export function createOpenShiftUseCase({ shiftRepository }: Dependencies) {
  return async function openShift(data: OpenShiftData): Promise<Shift> {
    if (data.initialCash < 0) {
      throw Errors.badRequest('initialCash must be >= 0')
    }
    const existing = await shiftRepository.findOpenByUser(data.userId, data.branchId)
    if (existing) {
      throw Errors.conflict('Ya existe un turno abierto para este cajero en esta sucursal')
    }
    return shiftRepository.open(data)
  }
}
