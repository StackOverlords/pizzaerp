import type { Category } from '../entities/category'

export interface CreateCategoryData {
  name: string
  orderIndex: number
}

export interface UpdateCategoryData {
  name: string
  orderIndex: number
}

export interface ICategoryRepository {
  findById(id: string): Promise<Category | null>
  list(filters: { activeOnly?: boolean }): Promise<Category[]>
  create(data: CreateCategoryData): Promise<Category>
  update(id: string, data: UpdateCategoryData): Promise<Category>
  deactivate(id: string): Promise<Category>
}
