import type { Combo, ComboSlot, ComboSlotOption } from '../entities/combo'

export interface CreateComboData {
  name: string
  description: string | null
  salePrice: number
  availableFrom: string | null
  availableTo: string | null
}

export interface UpdateComboData {
  name: string
  description: string | null
  salePrice: number
  availableFrom: string | null
  availableTo: string | null
}

export interface CreateComboSlotData {
  comboId: string
  name: string
  categoryId: string | null
  required: boolean
  orderIndex: number
}

export interface UpdateComboSlotData {
  name: string
  categoryId: string | null
  required: boolean
  orderIndex: number
}

export interface IComboRepository {
  findById(id: string): Promise<Combo | null>
  list(filters: { activeOnly?: boolean }): Promise<Combo[]>
  create(data: CreateComboData): Promise<Combo>
  update(id: string, data: UpdateComboData): Promise<Combo>
  deactivate(id: string): Promise<Combo>

  // Slots
  findSlotById(id: string): Promise<ComboSlot | null>
  listSlotsByCombo(comboId: string): Promise<ComboSlot[]>
  addSlot(data: CreateComboSlotData): Promise<ComboSlot>
  updateSlot(id: string, data: UpdateComboSlotData): Promise<ComboSlot>
  removeSlot(id: string): Promise<void>

  // Slot options
  listOptionsBySlot(slotId: string): Promise<ComboSlotOption[]>
  findOption(slotId: string, dishId: string): Promise<ComboSlotOption | null>
  addOption(slotId: string, dishId: string): Promise<ComboSlotOption>
  removeOption(id: string): Promise<void>
}
