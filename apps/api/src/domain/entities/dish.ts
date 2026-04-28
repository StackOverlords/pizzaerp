export interface Dish {
  id: string
  categoryId: string | null
  name: string
  description: string | null
  salePrice: number
  imageUrl: string | null
  active: boolean
  availableFrom: string | null  // TIME como "HH:MM:SS", null = siempre disponible
  availableTo: string | null
  createdAt: Date
  updatedAt: Date
}
