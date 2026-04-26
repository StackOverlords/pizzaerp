import type { User } from '../entities/user'

export interface IUserRepository {
  findByEmail(email: string, tenantId: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  create(data: Omit<User, 'id' | 'createdAt'>): Promise<User>
}
