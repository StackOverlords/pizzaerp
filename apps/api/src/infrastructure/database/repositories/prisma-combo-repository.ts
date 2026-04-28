import type { PrismaClient } from '@prisma/client'
import type { IComboRepository, CreateComboData, UpdateComboData, CreateComboSlotData, UpdateComboSlotData } from '../../../domain/repositories/i-combo-repository'
import type { Combo, ComboSlot, ComboSlotOption } from '../../../domain/entities/combo'

type RawCombo = {
  id: string
  name: string
  description: string | null
  sale_price: unknown
  active: boolean
  available_from: Date | null  // TIME vuelve como Date con fecha epoch (1970-01-01)
  available_to: Date | null
  created_at: Date
}

type RawSlot = {
  id: string
  combo_id: string
  name: string
  category_id: string | null
  required: boolean
  order_index: number
}

type RawOption = {
  id: string
  slot_id: string
  dish_id: string
}

export class PrismaComboRepository implements IComboRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  // ─── Combos ──────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<Combo | null> {
    const rows = await this.db.$queryRawUnsafe<RawCombo[]>(
      `SELECT id, name, description, sale_price, active, available_from, available_to, created_at
       FROM "${this.schema}".combos WHERE id = $1`,
      id,
    )
    return rows[0] ? this.toCombo(rows[0]) : null
  }

  async list({ activeOnly }: { activeOnly?: boolean }): Promise<Combo[]> {
    const rows = activeOnly
      ? await this.db.$queryRawUnsafe<RawCombo[]>(
          `SELECT id, name, description, sale_price, active, available_from, available_to, created_at
           FROM "${this.schema}".combos WHERE active = true ORDER BY name ASC`,
        )
      : await this.db.$queryRawUnsafe<RawCombo[]>(
          `SELECT id, name, description, sale_price, active, available_from, available_to, created_at
           FROM "${this.schema}".combos ORDER BY name ASC`,
        )
    return rows.map(r => this.toCombo(r))
  }

  async create(data: CreateComboData): Promise<Combo> {
    const rows = await this.db.$queryRawUnsafe<RawCombo[]>(
      `INSERT INTO "${this.schema}".combos (name, description, sale_price, available_from, available_to)
       VALUES ($1, $2, $3, $4::time, $5::time)
       RETURNING id, name, description, sale_price, active, available_from, available_to, created_at`,
      data.name, data.description, data.salePrice, data.availableFrom, data.availableTo,
    )
    return this.toCombo(rows[0])
  }

  async update(id: string, data: UpdateComboData): Promise<Combo> {
    const rows = await this.db.$queryRawUnsafe<RawCombo[]>(
      `UPDATE "${this.schema}".combos
       SET name = $1, description = $2, sale_price = $3, available_from = $4::time, available_to = $5::time
       WHERE id = $6
       RETURNING id, name, description, sale_price, active, available_from, available_to, created_at`,
      data.name, data.description, data.salePrice, data.availableFrom, data.availableTo, id,
    )
    return this.toCombo(rows[0])
  }

  async deactivate(id: string): Promise<Combo> {
    const rows = await this.db.$queryRawUnsafe<RawCombo[]>(
      `UPDATE "${this.schema}".combos SET active = false WHERE id = $1
       RETURNING id, name, description, sale_price, active, available_from, available_to, created_at`,
      id,
    )
    return this.toCombo(rows[0])
  }

  // ─── Slots ────────────────────────────────────────────────────────────────────

  async findSlotById(id: string): Promise<ComboSlot | null> {
    const rows = await this.db.$queryRawUnsafe<RawSlot[]>(
      `SELECT id, combo_id, name, category_id, required, order_index
       FROM "${this.schema}".combo_slots WHERE id = $1`,
      id,
    )
    return rows[0] ? this.toSlot(rows[0]) : null
  }

  async listSlotsByCombo(comboId: string): Promise<ComboSlot[]> {
    const rows = await this.db.$queryRawUnsafe<RawSlot[]>(
      `SELECT id, combo_id, name, category_id, required, order_index
       FROM "${this.schema}".combo_slots WHERE combo_id = $1 ORDER BY order_index ASC`,
      comboId,
    )
    return rows.map(r => this.toSlot(r))
  }

  async addSlot(data: CreateComboSlotData): Promise<ComboSlot> {
    const rows = await this.db.$queryRawUnsafe<RawSlot[]>(
      `INSERT INTO "${this.schema}".combo_slots (combo_id, name, category_id, required, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, combo_id, name, category_id, required, order_index`,
      data.comboId, data.name, data.categoryId, data.required, data.orderIndex,
    )
    return this.toSlot(rows[0])
  }

  async updateSlot(id: string, data: UpdateComboSlotData): Promise<ComboSlot> {
    const rows = await this.db.$queryRawUnsafe<RawSlot[]>(
      `UPDATE "${this.schema}".combo_slots
       SET name = $1, category_id = $2, required = $3, order_index = $4
       WHERE id = $5
       RETURNING id, combo_id, name, category_id, required, order_index`,
      data.name, data.categoryId, data.required, data.orderIndex, id,
    )
    return this.toSlot(rows[0])
  }

  async removeSlot(id: string): Promise<void> {
    // options cascade por FK — eliminamos options primero
    await this.db.$queryRawUnsafe(
      `DELETE FROM "${this.schema}".combo_slot_options WHERE slot_id = $1`, id,
    )
    await this.db.$queryRawUnsafe(
      `DELETE FROM "${this.schema}".combo_slots WHERE id = $1`, id,
    )
  }

  // ─── Slot options ─────────────────────────────────────────────────────────────

  async listOptionsBySlot(slotId: string): Promise<ComboSlotOption[]> {
    const rows = await this.db.$queryRawUnsafe<RawOption[]>(
      `SELECT id, slot_id, dish_id FROM "${this.schema}".combo_slot_options WHERE slot_id = $1`,
      slotId,
    )
    return rows.map(r => this.toOption(r))
  }

  async findOption(slotId: string, dishId: string): Promise<ComboSlotOption | null> {
    const rows = await this.db.$queryRawUnsafe<RawOption[]>(
      `SELECT id, slot_id, dish_id FROM "${this.schema}".combo_slot_options
       WHERE slot_id = $1 AND dish_id = $2`,
      slotId, dishId,
    )
    return rows[0] ? this.toOption(rows[0]) : null
  }

  async addOption(slotId: string, dishId: string): Promise<ComboSlotOption> {
    const rows = await this.db.$queryRawUnsafe<RawOption[]>(
      `INSERT INTO "${this.schema}".combo_slot_options (slot_id, dish_id)
       VALUES ($1, $2) RETURNING id, slot_id, dish_id`,
      slotId, dishId,
    )
    return this.toOption(rows[0])
  }

  async removeOption(id: string): Promise<void> {
    await this.db.$queryRawUnsafe(
      `DELETE FROM "${this.schema}".combo_slot_options WHERE id = $1`, id,
    )
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────────

  private toCombo(raw: RawCombo): Combo {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      salePrice: Number(raw.sale_price),
      active: raw.active,
      availableFrom: raw.available_from ? raw.available_from.toISOString().substring(11, 19) : null,
      availableTo: raw.available_to ? raw.available_to.toISOString().substring(11, 19) : null,
      createdAt: raw.created_at,
    }
  }

  private toSlot(raw: RawSlot): ComboSlot {
    return {
      id: raw.id,
      comboId: raw.combo_id,
      name: raw.name,
      categoryId: raw.category_id,
      required: raw.required,
      orderIndex: Number(raw.order_index),
    }
  }

  private toOption(raw: RawOption): ComboSlotOption {
    return { id: raw.id, slotId: raw.slot_id, dishId: raw.dish_id }
  }
}
