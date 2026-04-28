import type { IComboRepository } from '../../domain/repositories/i-combo-repository'
import type { ComboWithDetails } from '../../domain/entities/combo'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies { comboRepository: IComboRepository }

export function createGetComboUseCase({ comboRepository }: Dependencies) {
  return async function getCombo(id: string): Promise<ComboWithDetails> {
    const combo = await comboRepository.findById(id)
    if (!combo) throw Errors.notFound('Combo not found')

    const slots = await comboRepository.listSlotsByCombo(id)
    const slotsWithOptions = await Promise.all(
      slots.map(async slot => ({
        ...slot,
        options: await comboRepository.listOptionsBySlot(slot.id),
      })),
    )

    return { ...combo, slots: slotsWithOptions }
  }
}
