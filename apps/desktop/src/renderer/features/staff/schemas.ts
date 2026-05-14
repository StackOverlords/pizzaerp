import { z } from 'zod'

// ── Enums ──────────────────────────────────────────────────────────────────────

export const USER_ROLE = {
  ADMIN:   'ADMIN',
  CAJERO:  'CAJERO',
  HORNERO: 'HORNERO',
} as const
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

export const USER_ROLE_VALUES = [USER_ROLE.ADMIN, USER_ROLE.CAJERO, USER_ROLE.HORNERO] as const

// ── Entities ───────────────────────────────────────────────────────────────────

export const userSchema = z.object({
  id:        z.string(),
  username:  z.string(),
  role:      z.enum(USER_ROLE_VALUES),
  branchId:  z.string().nullable(),
  createdAt: z.coerce.date(),
})
export type User = z.infer<typeof userSchema>

export const branchSchema = z.object({
  id:       z.string(),
  name:     z.string(),
  tenantId: z.string(),
})
export type Branch = z.infer<typeof branchSchema>

// ── Form schemas ───────────────────────────────────────────────────────────────
// Sentinel "__none__" para branchId nullable en shadcn <Select> (no admite value="")

export const BRANCH_NONE_SENTINEL = '__none__' as const

export const createUserFormSchema = z.object({
  username: z.string().min(3, 'Mínimo 3 caracteres').max(50),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100),
  role:     z.enum(USER_ROLE_VALUES, { message: 'Requerido' }),
  branchId: z.string(),   // sentinel "__none__" → null en payload
})
export type CreateUserFormInput = z.infer<typeof createUserFormSchema>

export const updateUserFormSchema = z.object({
  role:     z.enum(USER_ROLE_VALUES, { message: 'Requerido' }),
  branchId: z.string(),
})
export type UpdateUserFormInput = z.infer<typeof updateUserFormSchema>

// API payloads (lo que viaja al backend)
export interface CreateUserPayload {
  username: string
  password: string
  role:     UserRole
  branchId?: string | null
}
export interface UpdateUserPayload {
  role?:     UserRole
  branchId?: string | null
}

export const branchFormSchema = z.object({
  name: z.string().min(1, 'Requerido').max(120),
})
export type BranchFormInput = z.infer<typeof branchFormSchema>

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Convierte sentinel "__none__" o "" → null. Caso contrario devuelve el id. */
export function branchValueToPayload(value: string): string | null {
  if (!value || value === BRANCH_NONE_SENTINEL) return null
  return value
}

/** Convierte branchId del backend (string | null) → valor del Select. */
export function branchPayloadToValue(value: string | null | undefined): string {
  return value ?? BRANCH_NONE_SENTINEL
}
