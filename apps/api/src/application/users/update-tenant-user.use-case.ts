import type { IUserRepository } from '../../domain/repositories/i-user-repository'
import type { IBranchRepository } from '../../domain/repositories/i-branch-repository'
import type { User, UserRole } from '../../domain/entities/user'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  userRepository: IUserRepository
  branchRepository: IBranchRepository
}

interface UpdateUserData {
  role?: UserRole
  branchId?: string | null
}

export function createUpdateTenantUserUseCase({ userRepository, branchRepository }: Dependencies) {
  return async function updateTenantUser(id: string, tenantId: string, data: UpdateUserData): Promise<User> {
    const existing = await userRepository.findById(id)
    if (!existing || existing.tenantId !== tenantId) throw Errors.notFound('User not found')
    if (data.branchId) {
      const branch = await branchRepository.findById(data.branchId, tenantId)
      if (!branch) throw Errors.badRequest('Branch does not belong to this tenant')
    }
    return userRepository.updateRoleAndBranch(id, data)
  }
}
