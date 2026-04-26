export const TenantStatus = {
  ONBOARDING: 'ONBOARDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CANCELED: 'CANCELED',
} as const

export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus]

export interface Tenant {
  id: string
  name: string
  slug: string
  schema: string
  status: TenantStatus
  billingEmail: string | null
  createdAt: Date
}
