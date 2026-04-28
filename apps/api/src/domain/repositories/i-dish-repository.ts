import type { Dish } from '../entities/dish'

export interface CreateDishData {
  categoryId: string | null
  name: string
  description: string | null
  salePrice: number
  imageUrl: string | null
  availableFrom: string | null
  availableTo: string | null
}

export interface UpdateDishData {
  categoryId: string | null
  name: string
  description: string | null
  salePrice: number
  imageUrl: string | null
  availableFrom: string | null
  availableTo: string | null
}

export interface IDishRepository {
  findById(id: string): Promise<Dish | null>
  list(filters: { activeOnly?: boolean; categoryId?: string; availableAt?: string }): Promise<Dish[]>
  create(data: CreateDishData): Promise<Dish>
  update(id: string, data: UpdateDishData): Promise<Dish>
  deactivate(id: string): Promise<Dish>
}
