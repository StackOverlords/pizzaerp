import type { User } from '../entities/user'

export interface IUserRepository {
  findByUsername(username: string, tenantId: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  create(data: Omit<User, 'id' | 'createdAt'>): Promise<User>
  updatePin(userId: string, pinHash: string): Promise<void>
}
