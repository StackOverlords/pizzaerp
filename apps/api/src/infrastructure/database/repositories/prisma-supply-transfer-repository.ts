import type { PrismaClient } from '@prisma/client'
import type { ISupplyTransferRepository, CreateSupplyTransferData, ListSupplyTransfersOpts, ReceiveItemData } from '../../../domain/repositories/i-supply-transfer-repository'
import type { SupplyTransfer, SupplyTransferItem, SupplyTransferWithItems, SupplyTransferStatus, SupplyType } from '../../../domain/entities/supply-transfer'

type RawTransfer = {
  id: string
  from_branch_id: string
  to_branch_id: string
  sent_by_user_id: string
  status: string
  transfer_date: Date
  notes: string | null
  sent_at: Date
  received_at: Date | null
}

type RawItem = {
  id: string
  transfer_id: string
  supply_type: string
  quantity_sent: number | bigint
  quantity_received: number | bigint | null
  notes: string | null
}

export class PrismaSupplyTransferRepository implements ISupplyTransferRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async create(data: CreateSupplyTransferData): Promise<SupplyTransferWithItems> {
    const transfers = await this.db.$queryRawUnsafe<RawTransfer[]>(
      `INSERT INTO "${this.schema}".supply_transfers
         (from_branch_id, to_branch_id, sent_by_user_id, transfer_date, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      data.fromBranchId,
      data.toBranchId,
      data.sentByUserId,
      data.transferDate,
      data.notes,
    )
    const transfer = transfers[0]

    const items: SupplyTransferItem[] = []
    for (const item of data.items) {
      const rows = await this.db.$queryRawUnsafe<RawItem[]>(
        `INSERT INTO "${this.schema}".supply_transfer_items
           (transfer_id, supply_type, quantity_sent, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        transfer.id,
        item.supplyType,
        item.quantitySent,
        item.notes,
      )
      items.push(this.toItemEntity(rows[0]))
    }

    return { ...this.toEntity(transfer), items }
  }

  async findById(id: string): Promise<SupplyTransferWithItems | null> {
    const transfers = await this.db.$queryRawUnsafe<RawTransfer[]>(
      `SELECT * FROM "${this.schema}".supply_transfers WHERE id = $1`,
      id,
    )
    if (!transfers[0]) return null

    const items = await this.db.$queryRawUnsafe<RawItem[]>(
      `SELECT * FROM "${this.schema}".supply_transfer_items WHERE transfer_id = $1`,
      id,
    )
    return { ...this.toEntity(transfers[0]), items: items.map(i => this.toItemEntity(i)) }
  }

  async list(opts: ListSupplyTransfersOpts): Promise<SupplyTransferWithItems[]> {
    const status = opts.status ?? null
    const from = opts.from ?? null
    const to = opts.to ?? null

    const transfers = await this.db.$queryRawUnsafe<RawTransfer[]>(
      `SELECT * FROM "${this.schema}".supply_transfers
       WHERE (from_branch_id = $1 OR to_branch_id = $1)
         AND ($2::text IS NULL OR status = $2)
         AND ($3::timestamptz IS NULL OR sent_at >= $3)
         AND ($4::timestamptz IS NULL OR sent_at <= $4)
       ORDER BY sent_at DESC`,
      opts.branchId, status, from, to,
    )

    if (transfers.length === 0) return []

    const ids = transfers.map(t => t.id)
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
    const allItems = await this.db.$queryRawUnsafe<RawItem[]>(
      `SELECT * FROM "${this.schema}".supply_transfer_items WHERE transfer_id IN (${placeholders})`,
      ...ids,
    )

    const itemsByTransfer = new Map<string, SupplyTransferItem[]>()
    for (const item of allItems) {
      const key = item.transfer_id
      if (!itemsByTransfer.has(key)) itemsByTransfer.set(key, [])
      itemsByTransfer.get(key)!.push(this.toItemEntity(item))
    }

    return transfers.map(t => ({
      ...this.toEntity(t),
      items: itemsByTransfer.get(t.id) ?? [],
    }))
  }

  async updateStatus(id: string, status: SupplyTransferStatus, receivedAt: Date): Promise<SupplyTransfer> {
    const rows = await this.db.$queryRawUnsafe<RawTransfer[]>(
      `UPDATE "${this.schema}".supply_transfers
       SET status = $2, received_at = $3
       WHERE id = $1
       RETURNING *`,
      id, status, receivedAt,
    )
    return this.toEntity(rows[0])
  }

  async receive(id: string, items: ReceiveItemData[], notes: string | null): Promise<SupplyTransferWithItems> {
    for (const item of items) {
      await this.db.$queryRawUnsafe(
        `UPDATE "${this.schema}".supply_transfer_items
         SET quantity_received = $2, notes = COALESCE($3, notes)
         WHERE transfer_id = $1 AND supply_type = $4`,
        id, item.quantityReceived, item.notes, item.supplyType,
      )
    }

    const transfers = await this.db.$queryRawUnsafe<RawTransfer[]>(
      `UPDATE "${this.schema}".supply_transfers
       SET status = 'RECEIVED', received_at = now(), notes = COALESCE($2, notes)
       WHERE id = $1
       RETURNING *`,
      id, notes,
    )

    const updatedItems = await this.db.$queryRawUnsafe<RawItem[]>(
      `SELECT * FROM "${this.schema}".supply_transfer_items WHERE transfer_id = $1`,
      id,
    )

    return {
      ...this.toEntity(transfers[0]),
      items: updatedItems.map(i => this.toItemEntity(i)),
    }
  }

  private toEntity(raw: RawTransfer): SupplyTransfer {
    return {
      id: raw.id,
      fromBranchId: raw.from_branch_id,
      toBranchId: raw.to_branch_id,
      sentByUserId: raw.sent_by_user_id,
      status: raw.status as SupplyTransferStatus,
      transferDate: raw.transfer_date,
      notes: raw.notes,
      sentAt: raw.sent_at,
      receivedAt: raw.received_at,
    }
  }

  private toItemEntity(raw: RawItem): SupplyTransferItem {
    return {
      id: raw.id,
      transferId: raw.transfer_id,
      supplyType: raw.supply_type as SupplyType,
      quantitySent: Number(raw.quantity_sent),
      quantityReceived: raw.quantity_received !== null ? Number(raw.quantity_received) : null,
      notes: raw.notes,
    }
  }
}
