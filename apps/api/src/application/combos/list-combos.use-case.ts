import type { IComboRepository } from '../../domain/repositories/i-combo-repository'
import type { Combo } from '../../domain/entities/combo'

interface Dependencies { comboRepository: IComboRepository }

export function createListCombosUseCase({ comboRepository }: Dependencies) {
  return async function listCombos(activeOnly = false): Promise<Combo[]> {
    return comboRepository.list({ activeOnly })
  }
}
