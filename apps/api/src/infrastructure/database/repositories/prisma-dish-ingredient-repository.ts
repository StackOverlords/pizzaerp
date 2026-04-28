import type { PrismaClient } from '@prisma/client'
import type { IDishIngredientRepository, AddDishIngredientData, UpdateDishIngredientData } from '../../../domain/repositories/i-dish-ingredient-repository'
import type { DishIngredient } from '../../../domain/entities/dish-ingredient'
import type { DishIngredientBehavior } from '../../../domain/entities/dish-ingredient'

type RawDishIngredient = {
  id: string
  dish_id: string
  ingredient_id: string
  base_quantity: unknown
  behavior: string
  extra_cost: unknown
}

export class PrismaDishIngredientRepository implements IDishIngredientRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly schema: string,
  ) {}

  async listByDish(dishId: string): Promise<DishIngredient[]> {
    const rows = await this.db.$queryRawUnsafe<RawDishIngredient[]>(
      `SELECT id, dish_id, ingredient_id, base_quantity, behavior, extra_cost
       FROM "${this.schema}".dish_ingredients
       WHERE dish_id = $1
       ORDER BY behavior ASC`,
      dishId,
    )
    return rows.map(r => this.toEntity(r))
  }

  async findByDishAndIngredient(dishId: string, ingredientId: string): Promise<DishIngredient | null> {
    const rows = await this.db.$queryRawUnsafe<RawDishIngredient[]>(
      `SELECT id, dish_id, ingredient_id, base_quantity, behavior, extra_cost
       FROM "${this.schema}".dish_ingredients
       WHERE dish_id = $1 AND ingredient_id = $2`,
      dishId,
      ingredientId,
    )
    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async add(data: AddDishIngredientData): Promise<DishIngredient> {
    const rows = await this.db.$queryRawUnsafe<RawDishIngredient[]>(
      `INSERT INTO "${this.schema}".dish_ingredients
         (dish_id, ingredient_id, base_quantity, behavior, extra_cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, dish_id, ingredient_id, base_quantity, behavior, extra_cost`,
      data.dishId,
      data.ingredientId,
      data.baseQuantity,
      data.behavior,
      data.extraCost,
    )
    return this.toEntity(rows[0])
  }

  async update(id: string, data: UpdateDishIngredientData): Promise<DishIngredient> {
    const rows = await this.db.$queryRawUnsafe<RawDishIngredient[]>(
      `UPDATE "${this.schema}".dish_ingredients
       SET base_quantity = $1,
           behavior      = $2,
           extra_cost    = $3
       WHERE id = $4
       RETURNING id, dish_id, ingredient_id, base_quantity, behavior, extra_cost`,
      data.baseQuantity,
      data.behavior,
      data.extraCost,
      id,
    )
    return this.toEntity(rows[0])
  }

  async remove(id: string): Promise<void> {
    await this.db.$queryRawUnsafe(
      `DELETE FROM "${this.schema}".dish_ingredients WHERE id = $1`,
      id,
    )
  }

  private toEntity(raw: RawDishIngredient): DishIngredient {
    return {
      id: raw.id,
      dishId: raw.dish_id,
      ingredientId: raw.ingredient_id,
      baseQuantity: Number(raw.base_quantity),
      behavior: raw.behavior as DishIngredientBehavior,
      extraCost: raw.extra_cost !== null ? Number(raw.extra_cost) : null,
    }
  }
}
