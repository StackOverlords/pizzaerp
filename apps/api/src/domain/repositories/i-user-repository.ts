import type { User, UserRole } from '../entities/user'

export interface IUserRepository {
  findByUsername(username: string, tenantId: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  findByIds(ids: string[]): Promise<Pick<User, 'id' | 'username'>[]>
  findAllByTenant(tenantId: string): Promise<User[]>
  findAdminsWithPin(tenantId: string): Promise<User[]>
  create(data: Omit<User, 'id' | 'createdAt'>): Promise<User>
  updatePin(userId: string, pinHash: string): Promise<void>
  updateRoleAndBranch(id: string, data: { role?: UserRole; branchId?: string | null }): Promise<User>
  delete(id: string): Promise<void>
}
