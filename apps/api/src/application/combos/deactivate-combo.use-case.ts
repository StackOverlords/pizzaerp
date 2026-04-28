import type { IComboRepository } from '../../domain/repositories/i-combo-repository'
import type { Combo } from '../../domain/entities/combo'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies { comboRepository: IComboRepository }

export function createDeactivateComboUseCase({ comboRepository }: Dependencies) {
  return async function deactivateCombo(id: string): Promise<Combo> {
    const existing = await comboRepository.findById(id)
    if (!existing) throw Errors.notFound('Combo not found')
    if (!existing.active) throw Errors.conflict('Combo is already inactive')
    return comboRepository.deactivate(id)
  }
}
