export interface Plan {
  id: string
  name: string
  maxBranches: number | null  // null = ilimitado
  maxUsers: number | null     // null = ilimitado
  features: string[]
  priceMonthly: number | null // null = licencia perpetua
  createdAt: Date
}
