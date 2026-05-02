import type { ISupplyTransferRepository, CreateSupplyTransferData } from '../../domain/repositories/i-supply-transfer-repository'
import type { ISupplyTypeRepository } from '../../domain/repositories/i-supply-type-repository'
import type { SupplyTransferWithItems } from '../../domain/entities/supply-transfer'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  supplyTransferRepository: ISupplyTransferRepository
  supplyTypeRepository: ISupplyTypeRepository
}

interface CreateDoughTransferInput {
  fromBranchId: string
  toBranchId: string
  sentByUserId: string
  transferDate: string
  notes?: string | null
  items: { supplyType: string; quantitySent: number; notes?: string | null }[]
}

export function createCreateSupplyTransferUseCase({ supplyTransferRepository, supplyTypeRepository }: Dependencies) {
  return async function createSupplyTransfer(input: CreateDoughTransferInput): Promise<SupplyTransferWithItems> {
    if (input.fromBranchId === input.toBranchId) {
      throw Errors.badRequest('La sucursal destino debe ser diferente a la sucursal origen')
    }
    if (!input.items || input.items.length === 0) {
      throw Errors.badRequest('Debe incluir al menos un tipo de masa')
    }

    const activeTypes = await supplyTypeRepository.listActive()
    const activeNames = new Set(activeTypes.map(t => t.name.toLowerCase()))

    for (const item of input.items) {
      if (!activeNames.has(item.supplyType.toLowerCase())) {
        throw Errors.badRequest(`Tipo de insumo inválido: "${item.supplyType}"`)
      }
      if (item.quantitySent <= 0) {
        throw Errors.badRequest('La cantidad enviada debe ser mayor a 0')
      }
    }

    const data: CreateSupplyTransferData = {
      fromBranchId: input.fromBranchId,
      toBranchId: input.toBranchId,
      sentByUserId: input.sentByUserId,
      transferDate: new Date(input.transferDate),
      notes: input.notes ?? null,
      items: input.items.map(i => ({
        supplyType: i.supplyType,
        quantitySent: i.quantitySent,
        notes: i.notes ?? null,
      })),
    }

    return supplyTransferRepository.create(data)
  }
}
