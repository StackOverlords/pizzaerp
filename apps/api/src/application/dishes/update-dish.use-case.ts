import type { IDishRepository, UpdateDishData } from '../../domain/repositories/i-dish-repository'
import type { Dish } from '../../domain/entities/dish'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  dishRepository: IDishRepository
}

export function createUpdateDishUseCase({ dishRepository }: Dependencies) {
  return async function updateDish(id: string, data: UpdateDishData): Promise<Dish> {
    const existing = await dishRepository.findById(id)
    if (!existing) throw Errors.notFound('Dish not found')
    if (data.salePrice <= 0) {
      throw Errors.badRequest('salePrice must be greater than 0')
    }
    return dishRepository.update(id, data)
  }
}
