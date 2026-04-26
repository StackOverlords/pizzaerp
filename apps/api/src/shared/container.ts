import { prisma } from '../infrastructure/database/prisma'
import { PrismaUserRepository } from '../infrastructure/database/repositories/prisma-user-repository'

// Repositories
export const userRepository = new PrismaUserRepository(prisma)

// Use cases are wired here as they get implemented (STA-12, STA-13...)
// Example:
// export const loginUseCase = new LoginUseCase(userRepository)
