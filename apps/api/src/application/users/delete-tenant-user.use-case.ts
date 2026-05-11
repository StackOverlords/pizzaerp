import type { IUserRepository } from '../../domain/repositories/i-user-repository'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  userRepository: IUserRepository
}

export function createDeleteTenantUserUseCase({ userRepository }: Dependencies) {
  return async function deleteTenantUser(id: string, tenantId: string): Promise<void> {
    const existing = await userRepository.findById(id)
    if (!existing || existing.tenantId !== tenantId) throw Errors.notFound('User not found')
    return userRepository.delete(id)
  }
}
