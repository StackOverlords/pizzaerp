import type { PrismaClient } from '@prisma/client'
import type { IUserRepository } from '../../../domain/repositories/i-user-repository'
import type { User } from '../../../domain/entities/user'
import type { UserRole } from '../../../domain/entities/user'

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByUsername(username: string, tenantId: string): Promise<User | null> {
    const user = await this.db.user.findFirst({ where: { username, tenantId } })
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

  async updatePin(userId: string, pinHash: string): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { pinHash } })
  }

  private toEntity(raw: {
    id: string
    username: string
    passwordHash: string
    pinHash: string | null
    role: string
    tenantId: string
    branchId: string | null
    createdAt: Date
  }): User {
    return {
      id: raw.id,
      username: raw.username,
      passwordHash: raw.passwordHash,
      pinHash: raw.pinHash,
      role: raw.role as UserRole,
      tenantId: raw.tenantId,
      branchId: raw.branchId,
      createdAt: raw.createdAt,
    }
  }
}
