import type { IUserRepository } from '../../domain/repositories/i-user-repository'
import type { User } from '../../domain/entities/user'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  userRepository: IUserRepository
  comparePassword: (password: string, hash: string) => Promise<boolean>
}

export function createLoginUseCase({ userRepository, comparePassword }: Dependencies) {
  return async function login(
    username: string,
    password: string,
    tenantId: string,
  ): Promise<User> {
    const user = await userRepository.findByUsername(username, tenantId)
    if (!user) throw Errors.unauthorized('Invalid credentials')

    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) throw Errors.unauthorized('Invalid credentials')

    return user
  }
}

export type LoginUseCase = ReturnType<typeof createLoginUseCase>
