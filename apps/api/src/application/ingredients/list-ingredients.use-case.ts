import type { IIngredientRepository } from '../../domain/repositories/i-ingredient-repository'
import type { Ingredient } from '../../domain/entities/ingredient'

interface Dependencies {
  ingredientRepository: IIngredientRepository
}

export function createListIngredientsUseCase({ ingredientRepository }: Dependencies) {
  return async function listIngredients(activeOnly = false): Promise<Ingredient[]> {
    return ingredientRepository.list({ activeOnly })
  }
}
