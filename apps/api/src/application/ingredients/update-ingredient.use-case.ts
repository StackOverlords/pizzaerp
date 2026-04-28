import type { IIngredientRepository, UpdateIngredientData } from '../../domain/repositories/i-ingredient-repository'
import type { Ingredient } from '../../domain/entities/ingredient'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  ingredientRepository: IIngredientRepository
}

export function createUpdateIngredientUseCase({ ingredientRepository }: Dependencies) {
  return async function updateIngredient(id: string, data: UpdateIngredientData): Promise<Ingredient> {
    const existing = await ingredientRepository.findById(id)
    if (!existing) throw Errors.notFound('Ingredient not found')

    if (data.conversionFactor <= 0) {
      throw Errors.badRequest('conversionFactor must be greater than 0')
    }
    if (data.wastagePercentage < 0 || data.wastagePercentage > 100) {
      throw Errors.badRequest('wastagePercentage must be between 0 and 100')
    }

    return ingredientRepository.update(id, data)
  }
}
