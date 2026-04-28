import type { ICategoryRepository, CreateCategoryData } from '../../domain/repositories/i-category-repository'
import type { Category } from '../../domain/entities/category'

interface Dependencies {
  categoryRepository: ICategoryRepository
}

export function createCreateCategoryUseCase({ categoryRepository }: Dependencies) {
  return async function createCategory(data: CreateCategoryData): Promise<Category> {
    return categoryRepository.create(data)
  }
}
