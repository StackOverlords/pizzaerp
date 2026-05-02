import type { IDoughTransferRepository, ReceiveItemData } from '../../domain/repositories/i-dough-transfer-repository'
import type { DoughTransferWithItems, DoughType } from '../../domain/entities/dough-transfer'
import { DoughTransferStatus } from '../../domain/entities/dough-transfer'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  doughTransferRepository: IDoughTransferRepository
}

interface ReceiveInput {
  transferId: string
  receivingBranchId: string
  items: { doughType: string; quantityReceived: number; notes?: string | null }[]
  notes?: string | null
}

export function createReceiveDoughTransferUseCase({ doughTransferRepository }: Dependencies) {
  return async function receiveDoughTransfer(input: ReceiveInput): Promise<DoughTransferWithItems> {
    const transfer = await doughTransferRepository.findById(input.transferId)
    if (!transfer) throw Errors.notFound(`Envío '${input.transferId}' no encontrado`)

    if (transfer.toBranchId !== input.receivingBranchId) {
      throw Errors.forbidden('Solo la sucursal destino puede confirmar la recepción')
    }
    if (transfer.status !== DoughTransferStatus.IN_TRANSIT) {
      throw Errors.badRequest('El envío ya fue recibido o no está en tránsito')
    }
    if (!input.items || input.items.length === 0) {
      throw Errors.badRequest('Debe confirmar al menos un tipo de masa')
    }

    const hasDifference = input.items.some(inputItem => {
      const sent = transfer.items.find(s => s.doughType === inputItem.doughType)
      return sent && sent.quantitySent !== inputItem.quantityReceived
    })

    if (hasDifference && !input.notes) {
      throw Errors.badRequest('Se requiere una observación cuando hay diferencia entre lo enviado y lo recibido')
    }

    const receiveItems: ReceiveItemData[] = input.items.map(i => ({
      doughType: i.doughType as DoughType,
      quantityReceived: i.quantityReceived,
      notes: i.notes ?? null,
    }))

    return doughTransferRepository.receive(input.transferId, receiveItems, input.notes ?? null)
  }
}
