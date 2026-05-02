import type { IDoughTransferRepository, CreateDoughTransferData } from '../../domain/repositories/i-dough-transfer-repository'
import type { DoughTransferWithItems } from '../../domain/entities/dough-transfer'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  doughTransferRepository: IDoughTransferRepository
}

interface CreateDoughTransferInput {
  fromBranchId: string
  toBranchId: string
  sentByUserId: string
  transferDate: string
  notes?: string | null
  items: { doughType: string; quantitySent: number; notes?: string | null }[]
}

export function createCreateDoughTransferUseCase({ doughTransferRepository }: Dependencies) {
  return async function createDoughTransfer(input: CreateDoughTransferInput): Promise<DoughTransferWithItems> {
    if (input.fromBranchId === input.toBranchId) {
      throw Errors.badRequest('La sucursal destino debe ser diferente a la sucursal origen')
    }
    if (!input.items || input.items.length === 0) {
      throw Errors.badRequest('Debe incluir al menos un tipo de masa')
    }
    for (const item of input.items) {
      if (item.quantitySent <= 0) {
        throw Errors.badRequest('La cantidad enviada debe ser mayor a 0')
      }
    }

    const data: CreateDoughTransferData = {
      fromBranchId: input.fromBranchId,
      toBranchId: input.toBranchId,
      sentByUserId: input.sentByUserId,
      transferDate: new Date(input.transferDate),
      notes: input.notes ?? null,
      items: input.items.map(i => ({
        doughType: i.doughType as CreateDoughTransferData['items'][0]['doughType'],
        quantitySent: i.quantitySent,
        notes: i.notes ?? null,
      })),
    }

    return doughTransferRepository.create(data)
  }
}
