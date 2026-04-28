import type { ICategoryRepository, UpdateCategoryData } from '../../domain/repositories/i-category-repository'
import type { Category } from '../../domain/entities/category'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  categoryRepository: ICategoryRepository
}

export function createUpdateCategoryUseCase({ categoryRepository }: Dependencies) {
  return async function updateCategory(id: string, data: UpdateCategoryData): Promise<Category> {
    const existing = await categoryRepository.findById(id)
    if (!existing) throw Errors.notFound('Category not found')
    return categoryRepository.update(id, data)
  }
}
