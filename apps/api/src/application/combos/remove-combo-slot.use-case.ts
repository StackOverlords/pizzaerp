import type { IComboRepository } from '../../domain/repositories/i-combo-repository'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies { comboRepository: IComboRepository }

export function createRemoveComboSlotUseCase({ comboRepository }: Dependencies) {
  return async function removeComboSlot(slotId: string): Promise<void> {
    const existing = await comboRepository.findSlotById(slotId)
    if (!existing) throw Errors.notFound('Slot not found')
    await comboRepository.removeSlot(slotId)
  }
}
