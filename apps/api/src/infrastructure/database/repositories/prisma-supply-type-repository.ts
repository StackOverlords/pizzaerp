import type { PrismaClient } from '@prisma/client'
import type { ISupplyTypeRepository, CreateSupplyTypeData, UpdateSupplyTypeData } from '../../../domain/repositories/i-supply-type-repository'
import type { SupplyType } from '../../../domain/entities/supply-type'

type RawSupplyType = {
  id: string
  name: string
  active: boolean
  created_at: Date
}

export class PrismaSupplyTypeRepository implements ISupplyTypeRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async findById(id: string): Promise<SupplyType | null> {
    const rows = await this.db.$queryRawUnsafe<RawSupplyType[]>(
      `SELECT * FROM "${this.schema}".supply_types WHERE id = $1`,
      id,
    )
    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async findByName(name: string): Promise<SupplyType | null> {
    const rows = await this.db.$queryRawUnsafe<RawSupplyType[]>(
      `SELECT * FROM "${this.schema}".supply_types WHERE LOWER(name) = LOWER($1)`,
      name,
    )
    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async list(): Promise<SupplyType[]> {
    const rows = await this.db.$queryRawUnsafe<RawSupplyType[]>(
      `SELECT * FROM "${this.schema}".supply_types ORDER BY name ASC`,
    )
    return rows.map(r => this.toEntity(r))
  }

  async listActive(): Promise<SupplyType[]> {
    const rows = await this.db.$queryRawUnsafe<RawSupplyType[]>(
      `SELECT * FROM "${this.schema}".supply_types WHERE active = true ORDER BY name ASC`,
    )
    return rows.map(r => this.toEntity(r))
  }

  async create(data: CreateSupplyTypeData): Promise<SupplyType> {
    const rows = await this.db.$queryRawUnsafe<RawSupplyType[]>(
      `INSERT INTO "${this.schema}".supply_types (name) VALUES ($1) RETURNING *`,
      data.name,
    )
    return this.toEntity(rows[0])
  }

  async update(id: string, data: UpdateSupplyTypeData): Promise<SupplyType> {
    const rows = await this.db.$queryRawUnsafe<RawSupplyType[]>(
      `UPDATE "${this.schema}".supply_types SET name = $1 WHERE id = $2 RETURNING *`,
      data.name, id,
    )
    return this.toEntity(rows[0])
  }

  async deactivate(id: string): Promise<SupplyType> {
    const rows = await this.db.$queryRawUnsafe<RawSupplyType[]>(
      `UPDATE "${this.schema}".supply_types SET active = false WHERE id = $1 RETURNING *`,
      id,
    )
    return this.toEntity(rows[0])
  }

  private toEntity(raw: RawSupplyType): SupplyType {
    return {
      id: raw.id,
      name: raw.name,
      active: raw.active,
      createdAt: raw.created_at,
    }
  }
}
