import type { IComboRepository } from '../../domain/repositories/i-combo-repository'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies { comboRepository: IComboRepository }

export function createRemoveSlotOptionUseCase({ comboRepository }: Dependencies) {
  return async function removeSlotOption(slotId: string, dishId: string): Promise<void> {
    const existing = await comboRepository.findOption(slotId, dishId)
    if (!existing) throw Errors.notFound('Option not found')
    await comboRepository.removeOption(existing.id)
  }
}
