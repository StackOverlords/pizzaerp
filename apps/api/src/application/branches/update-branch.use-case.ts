import type { IBranchRepository } from '../../domain/repositories/i-branch-repository'
import type { Branch } from '../../domain/entities/branch'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  branchRepository: IBranchRepository
}

export function createUpdateBranchUseCase({ branchRepository }: Dependencies) {
  return async function updateBranch(id: string, tenantId: string, name: string): Promise<Branch> {
    const existing = await branchRepository.findById(id, tenantId)
    if (!existing) throw Errors.notFound('Branch not found')
    return branchRepository.update(id, tenantId, name)
  }
}
