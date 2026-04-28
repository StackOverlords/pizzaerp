import type { ICategoryRepository } from '../../domain/repositories/i-category-repository'
import type { Category } from '../../domain/entities/category'

interface Dependencies {
  categoryRepository: ICategoryRepository
}

export function createListCategoriesUseCase({ categoryRepository }: Dependencies) {
  return async function listCategories(activeOnly = false): Promise<Category[]> {
    return categoryRepository.list({ activeOnly })
  }
}
