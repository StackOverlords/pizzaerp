import type { ICategoryRepository } from '../../domain/repositories/i-category-repository'
import type { Category } from '../../domain/entities/category'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  categoryRepository: ICategoryRepository
}

export function createDeactivateCategoryUseCase({ categoryRepository }: Dependencies) {
  return async function deactivateCategory(id: string): Promise<Category> {
    const existing = await categoryRepository.findById(id)
    if (!existing) throw Errors.notFound('Category not found')
    if (!existing.active) throw Errors.conflict('Category is already inactive')
    return categoryRepository.deactivate(id)
  }
}
