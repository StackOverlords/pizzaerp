import type { IShiftRepository, FindClosedOpts } from '../../domain/repositories/i-shift-repository'
import type { IUserRepository } from '../../domain/repositories/i-user-repository'
import type { ShiftWithClosure } from '../../domain/entities/shift'

interface Dependencies {
  shiftRepository: IShiftRepository
  userRepository: IUserRepository
}

export interface ListClosedShiftsInput {
  branchId: string
  page: number
  limit: number
  from?: Date
  to?: Date
}

export interface ShiftHistoryItem extends ShiftWithClosure {
  cashierUsername: string
}

export interface ListClosedShiftsResult {
  data: ShiftHistoryItem[]
  total: number
  page: number
  limit: number
}

export function createListClosedShiftsUseCase({ shiftRepository, userRepository }: Dependencies) {
  return async function listClosedShifts(input: ListClosedShiftsInput): Promise<ListClosedShiftsResult> {
    const page = Math.max(1, input.page)
    const limit = Math.min(100, Math.max(1, input.limit))

    const opts: FindClosedOpts = { page, limit, from: input.from, to: input.to }
    const { data, total } = await shiftRepository.findClosed(input.branchId, opts)

    const userIds = [...new Set(data.map(s => s.userId))]
    const users = await userRepository.findByIds(userIds)
    const usernameById = new Map(users.map(u => [u.id, u.username]))

    return {
      data: data.map(shift => ({ ...shift, cashierUsername: usernameById.get(shift.userId) ?? 'unknown' })),
      total,
      page,
      limit,
    }
  }
}
