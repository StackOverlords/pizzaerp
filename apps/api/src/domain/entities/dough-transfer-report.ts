import type { DoughType } from './dough-transfer'

export const StatusIndicator = { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' } as const
export type StatusIndicator = (typeof StatusIndicator)[keyof typeof StatusIndicator]

export interface DoughTypeReport {
  doughType: DoughType
  initialCount: number
  soldCount: number
  wastageCount: number
  theoreticalRemaining: number
  actualRemaining: number
  difference: number
  status: StatusIndicator
}

export interface DoughTransferReport {
  branchId: string
  date: string
  doughTypes: DoughTypeReport[]
  overallStatus: StatusIndicator
}

export function computeStatus(difference: number): StatusIndicator {
  if (difference === 0) return StatusIndicator.GREEN
  if (Math.abs(difference) <= 2) return StatusIndicator.YELLOW
  return StatusIndicator.RED
}

export function worstStatus(statuses: StatusIndicator[]): StatusIndicator {
  if (statuses.includes(StatusIndicator.RED)) return StatusIndicator.RED
  if (statuses.includes(StatusIndicator.YELLOW)) return StatusIndicator.YELLOW
  return StatusIndicator.GREEN
}
