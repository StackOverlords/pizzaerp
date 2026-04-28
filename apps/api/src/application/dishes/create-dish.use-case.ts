import type { IDishRepository, CreateDishData } from '../../domain/repositories/i-dish-repository'
import type { Dish } from '../../domain/entities/dish'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  dishRepository: IDishRepository
}

export function createCreateDishUseCase({ dishRepository }: Dependencies) {
  return async function createDish(data: CreateDishData): Promise<Dish> {
    if (data.salePrice <= 0) {
      throw Errors.badRequest('salePrice must be greater than 0')
    }
    return dishRepository.create(data)
  }
}
