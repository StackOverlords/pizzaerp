import type { IDoughDayClosureRepository } from '../../domain/repositories/i-dough-day-closure-repository'
import type { DoughTransferReport } from '../../domain/entities/dough-transfer-report'

interface Dependencies {
  doughDayClosureRepository: IDoughDayClosureRepository
}

interface ReportInput {
  branchId?: string
  from?: Date
  to?: Date
}

export function createGetDoughTransferReportUseCase({ doughDayClosureRepository }: Dependencies) {
  return async function getDoughTransferReport(input: ReportInput): Promise<DoughTransferReport[]> {
    return doughDayClosureRepository.getReport({
      branchId: input.branchId,
      from: input.from,
      to: input.to,
    })
  }
}
