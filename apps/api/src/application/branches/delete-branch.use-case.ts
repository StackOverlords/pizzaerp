import type { IBranchRepository } from '../../domain/repositories/i-branch-repository'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  branchRepository: IBranchRepository
}

export function createDeleteBranchUseCase({ branchRepository }: Dependencies) {
  return async function deleteBranch(id: string, tenantId: string): Promise<void> {
    const existing = await branchRepository.findById(id, tenantId)
    if (!existing) throw Errors.notFound('Branch not found')
    return branchRepository.delete(id, tenantId)
  }
}
