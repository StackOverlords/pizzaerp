import type { IIngredientRepository, CreateIngredientData } from '../../domain/repositories/i-ingredient-repository'
import type { Ingredient } from '../../domain/entities/ingredient'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  ingredientRepository: IIngredientRepository
}

export function createCreateIngredientUseCase({ ingredientRepository }: Dependencies) {
  return async function createIngredient(data: CreateIngredientData): Promise<Ingredient> {
    if (data.conversionFactor <= 0) {
      throw Errors.badRequest('conversionFactor must be greater than 0')
    }
    if (data.wastagePercentage < 0 || data.wastagePercentage > 100) {
      throw Errors.badRequest('wastagePercentage must be between 0 and 100')
    }
    return ingredientRepository.create(data)
  }
}
