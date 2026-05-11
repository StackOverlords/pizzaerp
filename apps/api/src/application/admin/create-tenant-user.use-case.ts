import type { ITenantRepository } from '../../domain/repositories/i-tenant-repository'
import type { IUserRepository } from '../../domain/repositories/i-user-repository'
import type { User } from '../../domain/entities/user'
import { UserRole } from '../../domain/entities/user'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  tenantRepository: ITenantRepository
  userRepository: IUserRepository
  hashPassword: (password: string) => Promise<string>
}

interface CreateTenantUserData {
  tenantId: string
  username: string
  password: string
  role?: UserRole
}

export function createCreateTenantUserUseCase({ tenantRepository, userRepository, hashPassword }: Dependencies) {
  return async function createTenantUser(data: CreateTenantUserData): Promise<User> {
    const tenant = await tenantRepository.findById(data.tenantId)
    if (!tenant) throw Errors.notFound('Tenant not found')
    // Super-admin can bypass plan limits intentionally (e.g., migration, support).

    const passwordHash = await hashPassword(data.password)

    return userRepository.create({
      username: data.username,
      passwordHash,
      pinHash: null,
      role: data.role ?? UserRole.ADMIN,
      tenantId: data.tenantId,
      branchId: null,
    })
  }
}

export type CreateTenantUserUseCase = ReturnType<typeof createCreateTenantUserUseCase>
