import type { IComboRepository, UpdateComboData } from '../../domain/repositories/i-combo-repository'
import type { Combo } from '../../domain/entities/combo'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies { comboRepository: IComboRepository }

export function createUpdateComboUseCase({ comboRepository }: Dependencies) {
  return async function updateCombo(id: string, data: UpdateComboData): Promise<Combo> {
    const existing = await comboRepository.findById(id)
    if (!existing) throw Errors.notFound('Combo not found')
    if (data.salePrice <= 0) throw Errors.badRequest('salePrice must be greater than 0')
    return comboRepository.update(id, data)
  }
}
