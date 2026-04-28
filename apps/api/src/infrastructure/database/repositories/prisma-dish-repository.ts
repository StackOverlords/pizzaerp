import type { PrismaClient } from '@prisma/client'
import type { IDishRepository, CreateDishData, UpdateDishData } from '../../../domain/repositories/i-dish-repository'
import type { Dish } from '../../../domain/entities/dish'

type RawDish = {
  id: string
  category_id: string | null
  name: string
  description: string | null
  sale_price: unknown
  image_url: string | null
  active: boolean
  available_from: Date | null  // TIME vuelve como Date con fecha epoch
  available_to: Date | null
  created_at: Date
  updated_at: Date
}

export class PrismaDishRepository implements IDishRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async findById(id: string): Promise<Dish | null> {
    const rows = await this.db.$queryRawUnsafe<RawDish[]>(
      `SELECT id, category_id, name, description, sale_price, image_url, active,
              available_from, available_to, created_at, updated_at
       FROM "${this.schema}".dishes
       WHERE id = $1`,
      id,
    )
    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async list({ activeOnly, categoryId, availableAt }: { activeOnly?: boolean; categoryId?: string; availableAt?: string }): Promise<Dish[]> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (activeOnly) conditions.push(`active = true`)

    if (categoryId !== undefined) {
      params.push(categoryId)
      conditions.push(`category_id = $${params.length}`)
    }

    if (availableAt !== undefined) {
      params.push(availableAt)
      conditions.push(
        `(available_from IS NULL OR available_from <= $${params.length}::time)`
        + ` AND (available_to IS NULL OR available_to >= $${params.length}::time)`,
      )
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = await this.db.$queryRawUnsafe<RawDish[]>(
      `SELECT id, category_id, name, description, sale_price, image_url, active,
              available_from, available_to, created_at, updated_at
       FROM "${this.schema}".dishes
       ${where}
       ORDER BY name ASC`,
      ...params,
    )
    return rows.map(r => this.toEntity(r))
  }

  async create(data: CreateDishData): Promise<Dish> {
    const rows = await this.db.$queryRawUnsafe<RawDish[]>(
      `INSERT INTO "${this.schema}".dishes
         (category_id, name, description, sale_price, image_url, available_from, available_to)
       VALUES ($1, $2, $3, $4, $5, $6::time, $7::time)
       RETURNING id, category_id, name, description, sale_price, image_url, active,
                 available_from, available_to, created_at, updated_at`,
      data.categoryId,
      data.name,
      data.description,
      data.salePrice,
      data.imageUrl,
      data.availableFrom,
      data.availableTo,
    )
    return this.toEntity(rows[0])
  }

  async update(id: string, data: UpdateDishData): Promise<Dish> {
    const rows = await this.db.$queryRawUnsafe<RawDish[]>(
      `UPDATE "${this.schema}".dishes
       SET category_id    = $1,
           name           = $2,
           description    = $3,
           sale_price     = $4,
           image_url      = $5,
           available_from = $6::time,
           available_to   = $7::time,
           updated_at     = now()
       WHERE id = $8
       RETURNING id, category_id, name, description, sale_price, image_url, active,
                 available_from, available_to, created_at, updated_at`,
      data.categoryId,
      data.name,
      data.description,
      data.salePrice,
      data.imageUrl,
      data.availableFrom,
      data.availableTo,
      id,
    )
    return this.toEntity(rows[0])
  }

  async deactivate(id: string): Promise<Dish> {
    const rows = await this.db.$queryRawUnsafe<RawDish[]>(
      `UPDATE "${this.schema}".dishes
       SET active = false, updated_at = now()
       WHERE id = $1
       RETURNING id, category_id, name, description, sale_price, image_url, active,
                 available_from, available_to, created_at, updated_at`,
      id,
    )
    return this.toEntity(rows[0])
  }

  private toTimeString(date: Date): string {
    return date.toISOString().substring(11, 19)
  }

  private toEntity(raw: RawDish): Dish {
    return {
      id: raw.id,
      categoryId: raw.category_id,
      name: raw.name,
      description: raw.description,
      salePrice: Number(raw.sale_price),
      imageUrl: raw.image_url,
      active: raw.active,
      availableFrom: raw.available_from ? this.toTimeString(raw.available_from) : null,
      availableTo: raw.available_to ? this.toTimeString(raw.available_to) : null,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    }
  }
}
