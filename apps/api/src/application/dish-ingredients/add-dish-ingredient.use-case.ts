import type { IDishIngredientRepository, AddDishIngredientData } from '../../domain/repositories/i-dish-ingredient-repository'
import type { IDishRepository } from '../../domain/repositories/i-dish-repository'
import type { IIngredientRepository } from '../../domain/repositories/i-ingredient-repository'
import type { DishIngredient } from '../../domain/entities/dish-ingredient'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  dishIngredientRepository: IDishIngredientRepository
  dishRepository: IDishRepository
  ingredientRepository: IIngredientRepository
}

export function createAddDishIngredientUseCase({ dishIngredientRepository, dishRepository, ingredientRepository }: Dependencies) {
  return async function addDishIngredient(data: AddDishIngredientData): Promise<DishIngredient> {
    const [dish, ingredient] = await Promise.all([
      dishRepository.findById(data.dishId),
      ingredientRepository.findById(data.ingredientId),
    ])
    if (!dish) throw Errors.notFound('Dish not found')
    if (!ingredient) throw Errors.notFound('Ingredient not found')

    if (data.baseQuantity <= 0) throw Errors.badRequest('baseQuantity must be greater than 0')

    const existing = await dishIngredientRepository.findByDishAndIngredient(data.dishId, data.ingredientId)
    if (existing) throw Errors.conflict('Ingredient is already associated with this dish')

    return dishIngredientRepository.add(data)
  }
}
