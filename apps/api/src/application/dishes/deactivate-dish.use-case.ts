import type { IDishRepository } from '../../domain/repositories/i-dish-repository'
import type { Dish } from '../../domain/entities/dish'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  dishRepository: IDishRepository
}

export function createDeactivateDishUseCase({ dishRepository }: Dependencies) {
  return async function deactivateDish(id: string): Promise<Dish> {
    const existing = await dishRepository.findById(id)
    if (!existing) throw Errors.notFound('Dish not found')
    if (!existing.active) throw Errors.conflict('Dish is already inactive')
    return dishRepository.deactivate(id)
  }
}
