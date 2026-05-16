import type { IComboRepository } from '../../domain/repositories/i-combo-repository'
import type { ComboWithDetails } from '../../domain/entities/combo'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies { comboRepository: IComboRepository }

export function createGetComboUseCase({ comboRepository }: Dependencies) {
  return async function getCombo(id: string): Promise<ComboWithDetails> {
    const combo = await comboRepository.findByIdWithDetails(id)
    if (!combo) throw Errors.notFound('Combo not found')
    return combo
  }
}
