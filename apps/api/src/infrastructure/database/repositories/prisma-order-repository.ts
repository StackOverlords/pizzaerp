import type { PrismaClient } from '@prisma/client'
import type {
  IOrderRepository,
  CreateOrderData,
  ListOrdersFilters,
  OrderListResult,
} from '../../../domain/repositories/i-order-repository'
import type { Order, OrderItem, OrderItemExtra, OrderItemExclusion, OrderItemComboSelection, OrderWithItems } from '../../../domain/entities/order'
import type { OrderStatus } from '../../../domain/entities/order'
import { OrderItemKind } from '../../../domain/entities/order'

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
  item_kind: string
  dish_id: string | null
  dish_name: string
  combo_id: string | null
  unit_price: unknown
  quantity: number | bigint
  subtotal: unknown
  notes: string | null
  created_at: Date
}

type RawOrderItemExtra = {
  id: string
  order_item_id: string
  dish_ingredient_id: string | null
  ingredient_name: string
  quantity: unknown
  unit_cost: unknown
  subtotal: unknown
}

type RawOrderItemExclusion = {
  id: string
  order_item_id: string
  dish_ingredient_id: string | null
  ingredient_name: string
}

type RawOrderItemComboSelection = {
  id: string
  order_item_id: string
  combo_slot_id: string | null
  slot_name: string
  dish_id: string | null
  dish_name: string
  order_index: number
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
    const schema = this.schema

    return this.db.$transaction(async (tx) => {
      const orderRows = await tx.$queryRawUnsafe<RawOrder[]>(
        `INSERT INTO "${schema}".orders
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

      type ItemWithExtras = {
        raw: RawOrderItem
        extras: RawOrderItemExtra[]
        exclusions: RawOrderItemExclusion[]
        selections: RawOrderItemComboSelection[]
      }
      const itemsWithExtras: ItemWithExtras[] = []

      for (const item of data.items) {
        const rows = await tx.$queryRawUnsafe<RawOrderItem[]>(
          `INSERT INTO "${schema}".order_items
             (order_id, item_kind, dish_id, dish_name, combo_id, unit_price, quantity, subtotal, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, order_id, item_kind, dish_id, dish_name, combo_id,
                     unit_price, quantity, subtotal, notes, created_at`,
          order.id,
          item.kind,
          item.dishId,
          item.dishName,
          item.comboId,
          item.unitPrice,
          item.quantity,
          item.subtotal,
          item.notes ?? null,
        )
        const itemRow = rows[0]
        let insertedExtras: RawOrderItemExtra[] = []
        let insertedExclusions: RawOrderItemExclusion[] = []
        let insertedSelections: RawOrderItemComboSelection[] = []

        // INSERT extras (multi-row)
        if (item.extras && item.extras.length > 0) {
          const values: string[] = []
          const params: unknown[] = []
          let i = 1
          for (const e of item.extras) {
            values.push(`($${i}, $${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`)
            params.push(itemRow.id, e.dishIngredientId, e.ingredientName, e.quantity, e.unitCost, e.subtotal)
            i += 6
          }
          insertedExtras = await tx.$queryRawUnsafe<RawOrderItemExtra[]>(
            `INSERT INTO "${schema}".order_item_extras
               (order_item_id, dish_ingredient_id, ingredient_name, quantity, unit_cost, subtotal)
             VALUES ${values.join(', ')}
             RETURNING id, order_item_id, dish_ingredient_id, ingredient_name, quantity, unit_cost, subtotal`,
            ...params,
          )
        }

        // INSERT exclusions (multi-row)
        if (item.exclusions && item.exclusions.length > 0) {
          const values: string[] = []
          const params: unknown[] = []
          let i = 1
          for (const x of item.exclusions) {
            values.push(`($${i}, $${i + 1}, $${i + 2})`)
            params.push(itemRow.id, x.dishIngredientId, x.ingredientName)
            i += 3
          }
          insertedExclusions = await tx.$queryRawUnsafe<RawOrderItemExclusion[]>(
            `INSERT INTO "${schema}".order_item_exclusions
               (order_item_id, dish_ingredient_id, ingredient_name)
             VALUES ${values.join(', ')}
             RETURNING id, order_item_id, dish_ingredient_id, ingredient_name`,
            ...params,
          )
        }

        // INSERT combo selections (multi-row)
        if (item.kind === OrderItemKind.COMBO && item.selections && item.selections.length > 0) {
          const values: string[] = []
          const params: unknown[] = []
          let i = 1
          for (const s of item.selections) {
            values.push(`($${i}, $${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`)
            params.push(itemRow.id, s.comboSlotId, s.slotName, s.dishId, s.dishName, s.orderIndex)
            i += 6
          }
          insertedSelections = await tx.$queryRawUnsafe<RawOrderItemComboSelection[]>(
            `INSERT INTO "${schema}".order_item_combo_selections
               (order_item_id, combo_slot_id, slot_name, dish_id, dish_name, order_index)
             VALUES ${values.join(', ')}
             RETURNING id, order_item_id, combo_slot_id, slot_name, dish_id, dish_name, order_index`,
            ...params,
          )
        }

        itemsWithExtras.push({ raw: itemRow, extras: insertedExtras, exclusions: insertedExclusions, selections: insertedSelections })
      }

      return {
        ...order,
        items: itemsWithExtras.map(({ raw, extras, exclusions, selections }) =>
          this.toItemEntity(raw, extras, exclusions, selections),
        ),
      }
    })
  }

  async applyDiscount(id: string, discountAmount: number): Promise<Order> {
    const rows = await this.db.$queryRawUnsafe<RawOrder[]>(
      `UPDATE "${this.schema}".orders
       SET discount_amount = discount_amount + $2,
           total           = subtotal - (discount_amount + $2),
           updated_at      = now()
       WHERE id = $1
       RETURNING id, order_number, shift_id, branch_id, user_id, status,
                 subtotal, discount_amount, total, notes, created_at, updated_at`,
      id,
      discountAmount,
    )
    return this.toOrderEntity(rows[0])
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

  async findByShiftId(shiftId: string): Promise<Order[]> {
    const rows = await this.db.$queryRawUnsafe<RawOrder[]>(
      `SELECT id, order_number, shift_id, branch_id, user_id, status,
              subtotal, discount_amount, total, notes, created_at, updated_at
       FROM "${this.schema}".orders
       WHERE shift_id = $1
       ORDER BY created_at ASC`,
      shiftId,
    )
    return rows.map(r => this.toOrderEntity(r))
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
      `SELECT id, order_id, item_kind, dish_id, dish_name, combo_id,
              unit_price, quantity, subtotal, notes, created_at
       FROM "${this.schema}".order_items
       WHERE order_id = $1
       ORDER BY created_at ASC`,
      id,
    )

    const itemIds = itemRows.map(r => r.id)

    let extraRows: RawOrderItemExtra[] = []
    let exclusionRows: RawOrderItemExclusion[] = []
    let selectionRows: RawOrderItemComboSelection[] = []

    if (itemIds.length > 0) {
      const placeholders = itemIds.map((_, i) => `$${i + 1}`).join(', ')
      extraRows = await this.db.$queryRawUnsafe<RawOrderItemExtra[]>(
        `SELECT id, order_item_id, dish_ingredient_id, ingredient_name, quantity, unit_cost, subtotal
         FROM "${this.schema}".order_item_extras
         WHERE order_item_id IN (${placeholders})`,
        ...itemIds,
      )
      exclusionRows = await this.db.$queryRawUnsafe<RawOrderItemExclusion[]>(
        `SELECT id, order_item_id, dish_ingredient_id, ingredient_name
         FROM "${this.schema}".order_item_exclusions
         WHERE order_item_id IN (${placeholders})`,
        ...itemIds,
      )
      selectionRows = await this.db.$queryRawUnsafe<RawOrderItemComboSelection[]>(
        `SELECT id, order_item_id, combo_slot_id, slot_name, dish_id, dish_name, order_index
         FROM "${this.schema}".order_item_combo_selections
         WHERE order_item_id IN (${placeholders})`,
        ...itemIds,
      )
    }

    const extrasByItemId = new Map<string, RawOrderItemExtra[]>()
    for (const e of extraRows) {
      const list = extrasByItemId.get(e.order_item_id) ?? []
      list.push(e)
      extrasByItemId.set(e.order_item_id, list)
    }

    const exclusionsByItemId = new Map<string, RawOrderItemExclusion[]>()
    for (const x of exclusionRows) {
      const list = exclusionsByItemId.get(x.order_item_id) ?? []
      list.push(x)
      exclusionsByItemId.set(x.order_item_id, list)
    }

    const selectionsByItemId = new Map<string, RawOrderItemComboSelection[]>()
    for (const s of selectionRows) {
      const list = selectionsByItemId.get(s.order_item_id) ?? []
      list.push(s)
      selectionsByItemId.set(s.order_item_id, list)
    }

    return {
      ...this.toOrderEntity(orderRows[0]),
      items: itemRows.map(r =>
        this.toItemEntity(
          r,
          extrasByItemId.get(r.id) ?? [],
          exclusionsByItemId.get(r.id) ?? [],
          selectionsByItemId.get(r.id) ?? [],
        ),
      ),
    }
  }

  async findMany(filters: ListOrdersFilters): Promise<OrderListResult> {
    const SORT_COLUMNS: Record<ListOrdersFilters['sortBy'], string> = {
      createdAt: 'created_at',
      orderNumber: 'order_number',
      total: 'total',
    }
    const SORT_DIRECTIONS: Record<ListOrdersFilters['sortOrder'], 'ASC' | 'DESC'> = {
      asc: 'ASC',
      desc: 'DESC',
    }

    const column = SORT_COLUMNS[filters.sortBy]
    const direction = SORT_DIRECTIONS[filters.sortOrder]
    const offset = (filters.page - 1) * filters.limit

    type RawRowWithCount = RawOrder & { total_count: bigint }

    const rows = await this.db.$queryRawUnsafe<RawRowWithCount[]>(
      `SELECT id, order_number, shift_id, branch_id, user_id, status,
              subtotal, discount_amount, total, notes, created_at, updated_at,
              COUNT(*) OVER() AS total_count
       FROM "${this.schema}".orders
       WHERE ($1::text IS NULL OR branch_id = $1)
         AND ($2::text IS NULL OR shift_id = $2)
         AND ($3::text IS NULL OR status   = $3)
         AND ($4::text IS NULL OR user_id  = $4)
         AND ($5::date IS NULL OR created_at::date >= $5::date)
         AND ($6::date IS NULL OR created_at::date <= $6::date)
       ORDER BY ${column} ${direction}
       LIMIT $7 OFFSET $8`,
      filters.branchId ?? null,
      filters.shiftId ?? null,
      filters.status ?? null,
      filters.userId ?? null,
      filters.from ?? null,
      filters.to ?? null,
      filters.limit,
      offset,
    )

    const total = rows[0] ? Number(rows[0].total_count) : 0

    return {
      data: rows.map(r => this.toOrderEntity(r)),
      total,
      page: filters.page,
      limit: filters.limit,
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

  private toItemEntity(
    raw: RawOrderItem,
    extras: RawOrderItemExtra[] = [],
    exclusions: RawOrderItemExclusion[] = [],
    selections: RawOrderItemComboSelection[] = [],
  ): OrderItem {
    const kind = raw.item_kind as OrderItemKind
    return {
      id: raw.id,
      orderId: raw.order_id,
      kind,
      dishId: raw.dish_id,
      dishName: raw.dish_name,
      comboId: raw.combo_id,
      comboName: kind === OrderItemKind.COMBO ? raw.dish_name : null,
      unitPrice: Number(raw.unit_price),
      quantity: Number(raw.quantity),
      subtotal: Number(raw.subtotal),
      notes: raw.notes,
      createdAt: raw.created_at,
      extras: extras.map(e => this.toExtraEntity(e)),
      exclusions: exclusions.map(x => this.toExclusionEntity(x)),
      selections: selections
        .sort((a, b) => a.order_index - b.order_index)
        .map(s => this.toSelectionEntity(s)),
    }
  }

  private toExtraEntity(raw: RawOrderItemExtra): OrderItemExtra {
    return {
      id: raw.id,
      orderItemId: raw.order_item_id,
      dishIngredientId: raw.dish_ingredient_id,
      ingredientName: raw.ingredient_name,
      quantity: Number(raw.quantity),
      unitCost: Number(raw.unit_cost),
      subtotal: Number(raw.subtotal),
    }
  }

  private toExclusionEntity(raw: RawOrderItemExclusion): OrderItemExclusion {
    return {
      id: raw.id,
      orderItemId: raw.order_item_id,
      dishIngredientId: raw.dish_ingredient_id,
      ingredientName: raw.ingredient_name,
    }
  }

  private toSelectionEntity(raw: RawOrderItemComboSelection): OrderItemComboSelection {
    return {
      id: raw.id,
      orderItemId: raw.order_item_id,
      comboSlotId: raw.combo_slot_id,
      slotName: raw.slot_name,
      dishId: raw.dish_id,
      dishName: raw.dish_name,
      orderIndex: Number(raw.order_index),
    }
  }
}
