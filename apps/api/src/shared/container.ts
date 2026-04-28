import { prisma } from '../infrastructure/database/prisma'
import { PrismaUserRepository } from '../infrastructure/database/repositories/prisma-user-repository'
import { bcryptService } from '../infrastructure/auth/bcrypt.service'
import { createLoginUseCase } from '../application/auth/login.use-case'

// Repositories
export const userRepository = new PrismaUserRepository(prisma)

// Use cases
export const loginUseCase = createLoginUseCase({
  userRepository,
  comparePassword: bcryptService.compare,
})
