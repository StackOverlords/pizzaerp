import type { IDishRepository } from '../../domain/repositories/i-dish-repository'
import type { IDishIngredientRepository } from '../../domain/repositories/i-dish-ingredient-repository'
import type { Dish } from '../../domain/entities/dish'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  dishRepository: IDishRepository
  dishIngredientRepository: IDishIngredientRepository
}

export function createCloneDishUseCase({ dishRepository, dishIngredientRepository }: Dependencies) {
  return async function cloneDish(originalId: string, overrideName?: string): Promise<Dish> {
    const original = await dishRepository.findById(originalId)
    if (!original) throw Errors.notFound('Dish not found')

    const cloned = await dishRepository.create({
      categoryId: original.categoryId,
      name: overrideName ?? `Copia de ${original.name}`,
      description: original.description,
      salePrice: original.salePrice,
      imageUrl: original.imageUrl,
      availableFrom: original.availableFrom,
      availableTo: original.availableTo,
    })

    const ingredients = await dishIngredientRepository.listByDish(originalId)
    await Promise.all(
      ingredients.map(di =>
        dishIngredientRepository.add({
          dishId: cloned.id,
          ingredientId: di.ingredientId,
          baseQuantity: di.baseQuantity,
          behavior: di.behavior,
          extraCost: di.extraCost,
        }),
      ),
    )

    return cloned
  }
}
