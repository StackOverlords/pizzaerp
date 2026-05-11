import type { IBranchRepository } from '../../domain/repositories/i-branch-repository'
import type { Branch } from '../../domain/entities/branch'

interface Dependencies {
  branchRepository: IBranchRepository
}

export function createListBranchesUseCase({ branchRepository }: Dependencies) {
  return async function listBranches(tenantId: string): Promise<Branch[]> {
    return branchRepository.findAllByTenant(tenantId)
  }
}
