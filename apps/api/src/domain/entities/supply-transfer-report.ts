import type { SupplyType } from './supply-transfer'

export const StatusIndicator = { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' } as const
export type StatusIndicator = (typeof StatusIndicator)[keyof typeof StatusIndicator]

export interface SupplyTypeReport {
  supplyType: SupplyType
  initialCount: number
  soldCount: number
  wastageCount: number
  theoreticalRemaining: number
  actualRemaining: number
  difference: number
  status: StatusIndicator
}

export interface SupplyTransferReport {
  branchId: string
  date: string
  doughTypes: SupplyTypeReport[]
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
