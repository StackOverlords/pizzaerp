import type { IComboRepository, CreateComboSlotData } from '../../domain/repositories/i-combo-repository'
import type { ComboSlot } from '../../domain/entities/combo'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies { comboRepository: IComboRepository }

export function createAddComboSlotUseCase({ comboRepository }: Dependencies) {
  return async function addComboSlot(data: CreateComboSlotData): Promise<ComboSlot> {
    const combo = await comboRepository.findById(data.comboId)
    if (!combo) throw Errors.notFound('Combo not found')
    return comboRepository.addSlot(data)
  }
}
