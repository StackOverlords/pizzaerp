import type { IShiftRepository } from '../../domain/repositories/i-shift-repository'
import type { Shift } from '../../domain/entities/shift'

interface Dependencies {
  shiftRepository: IShiftRepository
}

export function createGetCurrentShiftUseCase({ shiftRepository }: Dependencies) {
  return async function getCurrentShift(userId: string, branchId: string): Promise<Shift | null> {
    return shiftRepository.findOpenByUser(userId, branchId)
  }
}
