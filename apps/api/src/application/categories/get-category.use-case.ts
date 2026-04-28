import type { ICategoryRepository } from '../../domain/repositories/i-category-repository'
import type { Category } from '../../domain/entities/category'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  categoryRepository: ICategoryRepository
}

export function createGetCategoryUseCase({ categoryRepository }: Dependencies) {
  return async function getCategory(id: string): Promise<Category> {
    const category = await categoryRepository.findById(id)
    if (!category) throw Errors.notFound('Category not found')
    return category
  }
}
