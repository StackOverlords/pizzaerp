import type { ISupplyDayClosureRepository } from '../../domain/repositories/i-supply-day-closure-repository'
import type { SupplyTransferReport } from '../../domain/entities/supply-transfer-report'

interface Dependencies {
  supplyDayClosureRepository: ISupplyDayClosureRepository
}

interface ReportInput {
  branchId?: string
  from?: Date
  to?: Date
}

export function createGetSupplyTransferReportUseCase({ supplyDayClosureRepository }: Dependencies) {
  return async function getSupplyTransferReport(input: ReportInput): Promise<SupplyTransferReport[]> {
    return supplyDayClosureRepository.getReport({
      branchId: input.branchId,
      from: input.from,
      to: input.to,
    })
  }
}
