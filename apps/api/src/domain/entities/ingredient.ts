export interface Ingredient {
  id: string
  name: string
  purchaseUnit: string
  consumptionUnit: string
  conversionFactor: number
  wastagePercentage: number
  active: boolean
  createdAt: Date
}
