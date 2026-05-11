import type { IUserRepository } from '../../domain/repositories/i-user-repository'
import type { User } from '../../domain/entities/user'

interface Dependencies {
  userRepository: IUserRepository
}

export function createListTenantUsersUseCase({ userRepository }: Dependencies) {
  return async function listTenantUsers(tenantId: string): Promise<User[]> {
    return userRepository.findAllByTenant(tenantId)
  }
}
