import type { DishIngredient, DishIngredientBehavior } from '../entities/dish-ingredient'

export interface AddDishIngredientData {
  dishId: string
  ingredientId: string
  baseQuantity: number
  behavior: DishIngredientBehavior
  extraCost: number | null
}

export interface UpdateDishIngredientData {
  baseQuantity: number
  behavior: DishIngredientBehavior
  extraCost: number | null
}

export interface IDishIngredientRepository {
  listByDish(dishId: string): Promise<DishIngredient[]>
  findByDishAndIngredient(dishId: string, ingredientId: string): Promise<DishIngredient | null>
  add(data: AddDishIngredientData): Promise<DishIngredient>
  update(id: string, data: UpdateDishIngredientData): Promise<DishIngredient>
  remove(id: string): Promise<void>
}
