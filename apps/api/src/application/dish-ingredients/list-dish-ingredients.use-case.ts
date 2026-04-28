import type { IDishIngredientRepository } from '../../domain/repositories/i-dish-ingredient-repository'
import type { IDishRepository } from '../../domain/repositories/i-dish-repository'
import type { DishIngredient } from '../../domain/entities/dish-ingredient'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  dishIngredientRepository: IDishIngredientRepository
  dishRepository: IDishRepository
}

export function createListDishIngredientsUseCase({ dishIngredientRepository, dishRepository }: Dependencies) {
  return async function listDishIngredients(dishId: string): Promise<DishIngredient[]> {
    const dish = await dishRepository.findById(dishId)
    if (!dish) throw Errors.notFound('Dish not found')
    return dishIngredientRepository.listByDish(dishId)
  }
}
