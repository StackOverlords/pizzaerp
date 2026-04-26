export const SubscriptionStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CANCELED: 'CANCELED',
} as const

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export interface Subscription {
  id: string
  tenantId: string
  planId: string
  status: SubscriptionStatus
  trialEndsAt: Date | null
  currentPeriodEnd: Date | null  // null = licencia perpetua
  createdAt: Date
  updatedAt: Date
}
