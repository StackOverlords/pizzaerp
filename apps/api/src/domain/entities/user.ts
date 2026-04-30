export const UserRole = {
  ADMIN: 'ADMIN',
  CAJERO: 'CAJERO',
  HORNERO: 'HORNERO',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export interface User {
  id: string
  username: string
  passwordHash: string
  pinHash: string | null
  role: UserRole
  tenantId: string
  branchId: string | null
  createdAt: Date
}
