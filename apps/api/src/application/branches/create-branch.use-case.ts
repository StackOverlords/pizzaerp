import type { PrismaClient } from '@prisma/client'
import type { IBranchRepository } from '../../domain/repositories/i-branch-repository'
import type { Branch } from '../../domain/entities/branch'
import { assertBranchLimit } from '../shared/plan-limits.service'

interface Dependencies {
  branchRepository: IBranchRepository
  db: PrismaClient
}

export function createCreateBranchUseCase({ branchRepository, db }: Dependencies) {
  return async function createBranch(name: string, tenantId: string): Promise<Branch> {
    await assertBranchLimit(db, tenantId)
    return branchRepository.create({ name, tenantId })
  }
}
