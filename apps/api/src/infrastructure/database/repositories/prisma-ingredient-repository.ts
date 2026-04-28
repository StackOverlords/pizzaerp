import type { PrismaClient } from '@prisma/client'
import type { IIngredientRepository, CreateIngredientData, UpdateIngredientData } from '../../../domain/repositories/i-ingredient-repository'
import type { Ingredient } from '../../../domain/entities/ingredient'

// NUMERIC columns come back as Prisma.Decimal — Number() handles both Decimal and string
type RawIngredient = {
  id: string
  name: string
  purchase_unit: string
  consumption_unit: string
  conversion_factor: unknown
  wastage_percentage: unknown
  active: boolean
  created_at: Date
}

// Schema name comes from the DB (tenant lookup) — safe to interpolate in table identifier.
// Data parameters use $N placeholders to prevent SQL injection.
export class PrismaIngredientRepository implements IIngredientRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async findById(id: string): Promise<Ingredient | null> {
    const rows = await this.db.$queryRawUnsafe<RawIngredient[]>(
      `SELECT id, name, purchase_unit, consumption_unit,
              conversion_factor, wastage_percentage, active, created_at
       FROM "${this.schema}".ingredients
       WHERE id = $1`,
      id,
    )
    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async list({ activeOnly }: { activeOnly?: boolean }): Promise<Ingredient[]> {
    const rows = activeOnly
      ? await this.db.$queryRawUnsafe<RawIngredient[]>(
          `SELECT id, name, purchase_unit, consumption_unit,
                  conversion_factor, wastage_percentage, active, created_at
           FROM "${this.schema}".ingredients
           WHERE active = true
           ORDER BY name ASC`,
        )
      : await this.db.$queryRawUnsafe<RawIngredient[]>(
          `SELECT id, name, purchase_unit, consumption_unit,
                  conversion_factor, wastage_percentage, active, created_at
           FROM "${this.schema}".ingredients
           ORDER BY name ASC`,
        )
    return rows.map(r => this.toEntity(r))
  }

  async create(data: CreateIngredientData): Promise<Ingredient> {
    const rows = await this.db.$queryRawUnsafe<RawIngredient[]>(
      `INSERT INTO "${this.schema}".ingredients
         (name, purchase_unit, consumption_unit, conversion_factor, wastage_percentage)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, purchase_unit, consumption_unit,
                 conversion_factor, wastage_percentage, active, created_at`,
      data.name,
      data.purchaseUnit,
      data.consumptionUnit,
      data.conversionFactor,
      data.wastagePercentage,
    )
    return this.toEntity(rows[0])
  }

  async update(id: string, data: UpdateIngredientData): Promise<Ingredient> {
    const rows = await this.db.$queryRawUnsafe<RawIngredient[]>(
      `UPDATE "${this.schema}".ingredients
       SET name               = $1,
           purchase_unit      = $2,
           consumption_unit   = $3,
           conversion_factor  = $4,
           wastage_percentage = $5
       WHERE id = $6
       RETURNING id, name, purchase_unit, consumption_unit,
                 conversion_factor, wastage_percentage, active, created_at`,
      data.name,
      data.purchaseUnit,
      data.consumptionUnit,
      data.conversionFactor,
      data.wastagePercentage,
      id,
    )
    return this.toEntity(rows[0])
  }

  async deactivate(id: string): Promise<Ingredient> {
    const rows = await this.db.$queryRawUnsafe<RawIngredient[]>(
      `UPDATE "${this.schema}".ingredients
       SET active = false
       WHERE id = $1
       RETURNING id, name, purchase_unit, consumption_unit,
                 conversion_factor, wastage_percentage, active, created_at`,
      id,
    )
    return this.toEntity(rows[0])
  }

  private toEntity(raw: RawIngredient): Ingredient {
    return {
      id: raw.id,
      name: raw.name,
      purchaseUnit: raw.purchase_unit,
      consumptionUnit: raw.consumption_unit,
      conversionFactor: Number(raw.conversion_factor),
      wastagePercentage: Number(raw.wastage_percentage),
      active: raw.active,
      createdAt: raw.created_at,
    }
  }
}
