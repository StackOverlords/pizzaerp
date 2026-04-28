import type { IComboRepository } from '../../domain/repositories/i-combo-repository'
import type { IDishRepository } from '../../domain/repositories/i-dish-repository'
import type { ComboSlotOption } from '../../domain/entities/combo'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  comboRepository: IComboRepository
  dishRepository: IDishRepository
}

export function createAddSlotOptionUseCase({ comboRepository, dishRepository }: Dependencies) {
  return async function addSlotOption(slotId: string, dishId: string): Promise<ComboSlotOption> {
    const [slot, dish] = await Promise.all([
      comboRepository.findSlotById(slotId),
      dishRepository.findById(dishId),
    ])
    if (!slot) throw Errors.notFound('Slot not found')
    if (!dish) throw Errors.notFound('Dish not found')

    const existing = await comboRepository.findOption(slotId, dishId)
    if (existing) throw Errors.conflict('Dish is already an option for this slot')

    return comboRepository.addOption(slotId, dishId)
  }
}
