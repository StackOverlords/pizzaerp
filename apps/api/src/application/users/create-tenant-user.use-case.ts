import type { PrismaClient } from '@prisma/client'
import type { IUserRepository } from '../../domain/repositories/i-user-repository'
import type { IBranchRepository } from '../../domain/repositories/i-branch-repository'
import type { User, UserRole } from '../../domain/entities/user'
import { assertUserLimit } from '../shared/plan-limits.service'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  userRepository: IUserRepository
  branchRepository: IBranchRepository
  db: PrismaClient
  hashPassword: (password: string) => Promise<string>
}

interface CreateUserData {
  username: string
  password: string
  role?: UserRole
  branchId?: string | null
  tenantId: string
}

export function createCreateTenantUserUseCase({ userRepository, branchRepository, db, hashPassword }: Dependencies) {
  return async function createTenantUser(data: CreateUserData): Promise<User> {
    await assertUserLimit(db, data.tenantId)
    if (data.branchId) {
      const branch = await branchRepository.findById(data.branchId, data.tenantId)
      if (!branch) throw Errors.badRequest('Branch does not belong to this tenant')
    }
    const passwordHash = await hashPassword(data.password)
    return userRepository.create({
      username: data.username,
      passwordHash,
      pinHash: null,
      role: data.role ?? 'ADMIN',
      tenantId: data.tenantId,
      branchId: data.branchId ?? null,
    })
  }
}
