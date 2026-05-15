import type { ICashMovementRepository } from '../../domain/repositories/i-cash-movement-repository'
import type { IShiftRepository } from '../../domain/repositories/i-shift-repository'
import type { CashMovement } from '../../domain/entities/cash-movement'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  cashMovementRepository: ICashMovementRepository
  shiftRepository: IShiftRepository
}

export function createListCashMovementsForCurrentShiftUseCase({
  cashMovementRepository,
  shiftRepository,
}: Dependencies) {
  return async function list(userId: string, branchId: string): Promise<CashMovement[]> {
    const openShift = await shiftRepository.findOpenByUser(userId, branchId)
    if (!openShift) throw Errors.conflict('No open shift')
    return cashMovementRepository.listByShift(openShift.id)
  }
}
