import type { IDishIngredientRepository, UpdateDishIngredientData } from '../../domain/repositories/i-dish-ingredient-repository'
import type { DishIngredient } from '../../domain/entities/dish-ingredient'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  dishIngredientRepository: IDishIngredientRepository
}

export function createUpdateDishIngredientUseCase({ dishIngredientRepository }: Dependencies) {
  return async function updateDishIngredient(dishId: string, ingredientId: string, data: UpdateDishIngredientData): Promise<DishIngredient> {
    const existing = await dishIngredientRepository.findByDishAndIngredient(dishId, ingredientId)
    if (!existing) throw Errors.notFound('Association not found')

    if (data.baseQuantity <= 0) throw Errors.badRequest('baseQuantity must be greater than 0')

    return dishIngredientRepository.update(existing.id, data)
  }
}
