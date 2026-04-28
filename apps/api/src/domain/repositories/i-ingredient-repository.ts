import type { Ingredient } from '../entities/ingredient'

export interface CreateIngredientData {
  name: string
  purchaseUnit: string
  consumptionUnit: string
  conversionFactor: number
  wastagePercentage: number
}

export interface UpdateIngredientData {
  name: string
  purchaseUnit: string
  consumptionUnit: string
  conversionFactor: number
  wastagePercentage: number
}

export interface IIngredientRepository {
  findById(id: string): Promise<Ingredient | null>
  list(filters: { activeOnly?: boolean }): Promise<Ingredient[]>
  create(data: CreateIngredientData): Promise<Ingredient>
  update(id: string, data: UpdateIngredientData): Promise<Ingredient>
  deactivate(id: string): Promise<Ingredient>
}
