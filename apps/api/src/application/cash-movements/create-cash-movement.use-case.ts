import type { IShiftRepository } from '../../domain/repositories/i-shift-repository'
import type { ICashMovementRepository } from '../../domain/repositories/i-cash-movement-repository'
import type { CashMovement, CashMovementType } from '../../domain/entities/cash-movement'
import { ShiftStatus } from '../../domain/entities/shift'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  shiftRepository: IShiftRepository
  cashMovementRepository: ICashMovementRepository
}

export interface CreateCashMovementInput {
  userId: string
  branchId: string
  type: CashMovementType
  amount: number
  reason: string
}

export function createCreateCashMovementUseCase({
  shiftRepository,
  cashMovementRepository,
}: Dependencies) {
  return async function createCashMovement(input: CreateCashMovementInput): Promise<CashMovement> {
    if (input.amount <= 0) throw Errors.badRequest('amount must be > 0')
    if (!input.reason?.trim()) throw Errors.badRequest('reason is required')
    if (input.reason.length > 200) throw Errors.badRequest('reason too long (max 200)')

    const openShift = await shiftRepository.findOpenByUser(input.userId, input.branchId)
    if (!openShift) throw Errors.conflict('No open shift to register movement')
    if (openShift.status !== ShiftStatus.OPEN) throw Errors.conflict('Shift is not open')

    return cashMovementRepository.create({
      shiftId:         openShift.id,
      type:            input.type,
      amount:          parseFloat(input.amount.toFixed(2)),
      reason:          input.reason.trim(),
      createdByUserId: input.userId,
    })
  }
}
