export interface Combo {
  id: string
  name: string
  description: string | null
  salePrice: number
  active: boolean
  availableFrom: string | null  // TIME as "HH:MM:SS", null = siempre disponible
  availableTo: string | null
  createdAt: Date
}

export interface ComboSlot {
  id: string
  comboId: string
  name: string
  categoryId: string | null
  required: boolean
  orderIndex: number
}

export interface ComboSlotOption {
  id: string
  slotId: string
  dishId: string
}

export interface ComboWithDetails extends Combo {
  slots: (ComboSlot & { options: ComboSlotOption[] })[]
}
