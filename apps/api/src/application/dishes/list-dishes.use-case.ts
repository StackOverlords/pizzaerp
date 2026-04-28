import type { IDishRepository } from '../../domain/repositories/i-dish-repository'
import type { Dish } from '../../domain/entities/dish'

interface Dependencies {
  dishRepository: IDishRepository
}

export function createListDishesUseCase({ dishRepository }: Dependencies) {
  return async function listDishes(filters: { activeOnly?: boolean; categoryId?: string; availableAt?: string } = {}): Promise<Dish[]> {
    return dishRepository.list(filters)
  }
}
