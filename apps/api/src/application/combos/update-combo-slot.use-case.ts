import type { IComboRepository, UpdateComboSlotData } from '../../domain/repositories/i-combo-repository'
import type { ComboSlot } from '../../domain/entities/combo'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies { comboRepository: IComboRepository }

export function createUpdateComboSlotUseCase({ comboRepository }: Dependencies) {
  return async function updateComboSlot(slotId: string, data: UpdateComboSlotData): Promise<ComboSlot> {
    const existing = await comboRepository.findSlotById(slotId)
    if (!existing) throw Errors.notFound('Slot not found')
    return comboRepository.updateSlot(slotId, data)
  }
}
