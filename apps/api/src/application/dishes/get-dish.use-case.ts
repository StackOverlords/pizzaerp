import type { IDishRepository } from '../../domain/repositories/i-dish-repository'
import type { Dish } from '../../domain/entities/dish'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  dishRepository: IDishRepository
}

export function createGetDishUseCase({ dishRepository }: Dependencies) {
  return async function getDish(id: string): Promise<Dish> {
    const dish = await dishRepository.findById(id)
    if (!dish) throw Errors.notFound('Dish not found')
    return dish
  }
}
