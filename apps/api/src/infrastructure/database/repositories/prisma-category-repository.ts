import type { PrismaClient } from '@prisma/client'
import type { ICategoryRepository, CreateCategoryData, UpdateCategoryData } from '../../../domain/repositories/i-category-repository'
import type { Category } from '../../../domain/entities/category'

type RawCategory = {
  id: string
  name: string
  order_index: number
  active: boolean
  created_at: Date
}

export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async findById(id: string): Promise<Category | null> {
    const rows = await this.db.$queryRawUnsafe<RawCategory[]>(
      `SELECT id, name, order_index, active, created_at
       FROM "${this.schema}".categories
       WHERE id = $1`,
      id,
    )
    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async list({ activeOnly }: { activeOnly?: boolean }): Promise<Category[]> {
    const rows = activeOnly
      ? await this.db.$queryRawUnsafe<RawCategory[]>(
          `SELECT id, name, order_index, active, created_at
           FROM "${this.schema}".categories
           WHERE active = true
           ORDER BY order_index ASC, name ASC`,
        )
      : await this.db.$queryRawUnsafe<RawCategory[]>(
          `SELECT id, name, order_index, active, created_at
           FROM "${this.schema}".categories
           ORDER BY order_index ASC, name ASC`,
        )
    return rows.map(r => this.toEntity(r))
  }

  async create(data: CreateCategoryData): Promise<Category> {
    const rows = await this.db.$queryRawUnsafe<RawCategory[]>(
      `INSERT INTO "${this.schema}".categories (name, order_index)
       VALUES ($1, $2)
       RETURNING id, name, order_index, active, created_at`,
      data.name,
      data.orderIndex,
    )
    return this.toEntity(rows[0])
  }

  async update(id: string, data: UpdateCategoryData): Promise<Category> {
    const rows = await this.db.$queryRawUnsafe<RawCategory[]>(
      `UPDATE "${this.schema}".categories
       SET name        = $1,
           order_index = $2
       WHERE id = $3
       RETURNING id, name, order_index, active, created_at`,
      data.name,
      data.orderIndex,
      id,
    )
    return this.toEntity(rows[0])
  }

  async deactivate(id: string): Promise<Category> {
    const rows = await this.db.$queryRawUnsafe<RawCategory[]>(
      `UPDATE "${this.schema}".categories
       SET active = false
       WHERE id = $1
       RETURNING id, name, order_index, active, created_at`,
      id,
    )
    return this.toEntity(rows[0])
  }

  private toEntity(raw: RawCategory): Category {
    return {
      id: raw.id,
      name: raw.name,
      orderIndex: Number(raw.order_index),
      active: raw.active,
      createdAt: raw.created_at,
    }
  }
}
