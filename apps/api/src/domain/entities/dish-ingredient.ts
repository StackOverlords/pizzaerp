export const DishIngredientBehavior = {
  INCLUDED: 'INCLUDED',
  OPTIONAL: 'OPTIONAL',
  EXTRA: 'EXTRA',
} as const

export type DishIngredientBehavior = (typeof DishIngredientBehavior)[keyof typeof DishIngredientBehavior]

export interface DishIngredient {
  id: string
  dishId: string
  ingredientId: string
  baseQuantity: number
  behavior: DishIngredientBehavior
  extraCost: number | null
}
