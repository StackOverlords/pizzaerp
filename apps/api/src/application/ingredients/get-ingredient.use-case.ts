import type { IIngredientRepository } from '../../domain/repositories/i-ingredient-repository'
import type { Ingredient } from '../../domain/entities/ingredient'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  ingredientRepository: IIngredientRepository
}

export function createGetIngredientUseCase({ ingredientRepository }: Dependencies) {
  return async function getIngredient(id: string): Promise<Ingredient> {
    const ingredient = await ingredientRepository.findById(id)
    if (!ingredient) throw Errors.notFound('Ingredient not found')
    return ingredient
  }
}
