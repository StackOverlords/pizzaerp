import type { IDishIngredientRepository } from '../../domain/repositories/i-dish-ingredient-repository'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  dishIngredientRepository: IDishIngredientRepository
}

export function createRemoveDishIngredientUseCase({ dishIngredientRepository }: Dependencies) {
  return async function removeDishIngredient(dishId: string, ingredientId: string): Promise<void> {
    const existing = await dishIngredientRepository.findByDishAndIngredient(dishId, ingredientId)
    if (!existing) throw Errors.notFound('Association not found')
    await dishIngredientRepository.remove(existing.id)
  }
}
