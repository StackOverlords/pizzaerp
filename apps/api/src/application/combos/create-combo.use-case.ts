import type { IComboRepository, CreateComboData } from '../../domain/repositories/i-combo-repository'
import type { Combo } from '../../domain/entities/combo'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies { comboRepository: IComboRepository }

export function createCreateComboUseCase({ comboRepository }: Dependencies) {
  return async function createCombo(data: CreateComboData): Promise<Combo> {
    if (data.salePrice <= 0) throw Errors.badRequest('salePrice must be greater than 0')
    return comboRepository.create(data)
  }
}
