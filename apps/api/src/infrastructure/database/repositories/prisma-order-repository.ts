import type { PrismaClient } from '@prisma/client'
import type { IOrderRepository, CreateOrderData } from '../../../domain/repositories/i-order-repository'
import type { Order, OrderItem, OrderWithItems } from '../../../domain/entities/order'
import type { OrderStatus } from '../../../domain/entities/order'

type RawOrder = {
  id: string
  order_number: number | bigint
  shift_id: string
  branch_id: string
  user_id: string
  status: string
  subtotal: unknown
  discount_amount: unknown
  total: unknown
  notes: string | null
  created_at: Date
  updated_at: Date
}

type RawOrderItem = {
  id: string
  order_id: string
  dish_id: string | null
  dish_name: string
  unit_price: unknown
  quantity: number | bigint
  subtotal: unknown
  notes: string | null
  created_at: Date
}

export class PrismaOrderRepository implements IOrderRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async getNextOrderNumber(branchId: string): Promise<number> {
    const rows = await this.db.$queryRawUnsafe<{ next: bigint }[]>(
      `SELECT COALESCE(MAX(order_number), 0) + 1 AS next
       FROM "${this.schema}".orders
       WHERE branch_id = $1 AND created_at::date = CURRENT_DATE`,
      branchId,
    )
    return Number(rows[0].next)
  }

  async create(data: CreateOrderData): Promise<OrderWithItems> {
    const orderRows = await this.db.$queryRawUnsafe<RawOrder[]>(
      `INSERT INTO "${this.schema}".orders
         (order_number, shift_id, branch_id, user_id, subtotal, discount_amount, total, notes)
       VALUES ($1, $2, $3, $4, $5, 0, $6, $7)
       RETURNING id, order_number, shift_id, branch_id, user_id, status,
                 subtotal, discount_amount, total, notes, created_at, updated_at`,
      data.orderNumber,
      data.shiftId,
      data.branchId,
      data.userId,
      data.subtotal,
      data.total,
      data.notes ?? null,
    )
    const order = this.toOrderEntity(orderRows[0])

    const itemRows: RawOrderItem[] = []
    for (const item of data.items) {
      const rows = await this.db.$queryRawUnsafe<RawOrderItem[]>(
        `INSERT INTO "${this.schema}".order_items
           (order_id, dish_id, dish_name, unit_price, quantity, subtotal, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, order_id, dish_id, dish_name, unit_price, quantity, subtotal, notes, created_at`,
        order.id,
        item.dishId,
        item.dishName,
        item.unitPrice,
        item.quantity,
        item.subtotal,
        item.notes ?? null,
      )
      itemRows.push(rows[0])
    }

    return { ...order, items: itemRows.map(r => this.toItemEntity(r)) }
  }

  async cancel(id: string): Promise<Order> {
    const rows = await this.db.$queryRawUnsafe<RawOrder[]>(
      `UPDATE "${this.schema}".orders
       SET status = 'CANCELLED', updated_at = now()
       WHERE id = $1
       RETURNING id, order_number, shift_id, branch_id, user_id, status,
                 subtotal, discount_amount, total, notes, created_at, updated_at`,
      id,
    )
    return this.toOrderEntity(rows[0])
  }

  async pay(id: string): Promise<Order> {
    const rows = await this.db.$queryRawUnsafe<RawOrder[]>(
      `UPDATE "${this.schema}".orders
       SET status = 'PAID', updated_at = now()
       WHERE id = $1
       RETURNING id, order_number, shift_id, branch_id, user_id, status,
                 subtotal, discount_amount, total, notes, created_at, updated_at`,
      id,
    )
    return this.toOrderEntity(rows[0])
  }

  async findById(id: string): Promise<OrderWithItems | null> {
    const orderRows = await this.db.$queryRawUnsafe<RawOrder[]>(
      `SELECT id, order_number, shift_id, branch_id, user_id, status,
              subtotal, discount_amount, total, notes, created_at, updated_at
       FROM "${this.schema}".orders
       WHERE id = $1`,
      id,
    )
    if (!orderRows[0]) return null

    const itemRows = await this.db.$queryRawUnsafe<RawOrderItem[]>(
      `SELECT id, order_id, dish_id, dish_name, unit_price, quantity, subtotal, notes, created_at
       FROM "${this.schema}".order_items
       WHERE order_id = $1
       ORDER BY created_at ASC`,
      id,
    )

    return {
      ...this.toOrderEntity(orderRows[0]),
      items: itemRows.map(r => this.toItemEntity(r)),
    }
  }

  private toOrderEntity(raw: RawOrder): Order {
    return {
      id: raw.id,
      orderNumber: Number(raw.order_number),
      shiftId: raw.shift_id,
      branchId: raw.branch_id,
      userId: raw.user_id,
      status: raw.status as OrderStatus,
      subtotal: Number(raw.subtotal),
      discountAmount: Number(raw.discount_amount),
      total: Number(raw.total),
      notes: raw.notes,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    }
  }

  private toItemEntity(raw: RawOrderItem): OrderItem {
    return {
      id: raw.id,
      orderId: raw.order_id,
      dishId: raw.dish_id,
      dishName: raw.dish_name,
      unitPrice: Number(raw.unit_price),
      quantity: Number(raw.quantity),
      subtotal: Number(raw.subtotal),
      notes: raw.notes,
      createdAt: raw.created_at,
    }
  }
}
