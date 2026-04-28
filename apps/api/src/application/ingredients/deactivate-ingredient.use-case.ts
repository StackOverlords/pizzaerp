import type { IIngredientRepository } from '../../domain/repositories/i-ingredient-repository'
import type { Ingredient } from '../../domain/entities/ingredient'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  ingredientRepository: IIngredientRepository
}

export function createDeactivateIngredientUseCase({ ingredientRepository }: Dependencies) {
  return async function deactivateIngredient(id: string): Promise<Ingredient> {
    const existing = await ingredientRepository.findById(id)
    if (!existing) throw Errors.notFound('Ingredient not found')
    if (!existing.active) throw Errors.conflict('Ingredient is already inactive')
    return ingredientRepository.deactivate(id)
  }
}
