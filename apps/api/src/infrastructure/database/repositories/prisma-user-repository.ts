import type { PrismaClient } from '@prisma/client'
import type { IUserRepository } from '../../../domain/repositories/i-user-repository'
import type { User } from '../../../domain/entities/user'
import type { UserRole } from '../../../domain/entities/user'

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    const user = await this.db.user.findFirst({ where: { email, tenantId } })
    return user ? this.toEntity(user) : null
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.db.user.findUnique({ where: { id } })
    return user ? this.toEntity(user) : null
  }

  async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user = await this.db.user.create({ data })
    return this.toEntity(user)
  }

  private toEntity(raw: {
    id: string
    email: string
    passwordHash: string
    role: string
    tenantId: string
    branchId: string | null
    createdAt: Date
  }): User {
    return {
      id: raw.id,
      email: raw.email,
      passwordHash: raw.passwordHash,
      role: raw.role as UserRole,
      tenantId: raw.tenantId,
      branchId: raw.branchId,
      createdAt: raw.createdAt,
    }
  }
}
