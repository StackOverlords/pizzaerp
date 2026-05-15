import { z } from 'zod'

// ── Entities ───────────────────────────────────────────────────────────────────

export const dishSchema = z.object({
  id:            z.string(),
  categoryId:    z.string().nullable(),
  name:          z.string(),
  description:   z.string().nullable(),
  salePrice:     z.number(),
  imageUrl:      z.string().nullable(),
  active:        z.boolean(),
  availableFrom: z.string().nullable(),   // "HH:MM:SS" from API — kept as-is
  availableTo:   z.string().nullable(),
  createdAt:     z.coerce.date(),
  updatedAt:     z.coerce.date(),
})
export type Dish = z.infer<typeof dishSchema>

export const categorySchema = z.object({
  id:         z.string(),
  name:       z.string(),
  orderIndex: z.number().int(),
  active:     z.boolean(),
  createdAt:  z.coerce.date(),
})
export type Category = z.infer<typeof categorySchema>

// ── Filters ────────────────────────────────────────────────────────────────────

export const dishFiltersSchema = z.object({
  activeOnly:  z.boolean().optional(),
  categoryId:  z.string().optional(),
  availableAt: z.string().optional(),   // "HH:MM"
})
export type DishFilters = z.infer<typeof dishFiltersSchema>

export const categoryFiltersSchema = z.object({
  activeOnly: z.boolean().optional(),
})
export type CategoryFilters = z.infer<typeof categoryFiltersSchema>

// ── Form input schemas ─────────────────────────────────────────────────────────

export const dishFormSchema = z.object({
  name:          z.string().min(1, 'Requerido').max(120),
  salePrice:     z.number({ message: 'Requerido' }).finite().positive('Debe ser mayor a 0'),
  categoryId:    z.string().nullable().optional(),
  description:   z.string().max(500).nullable().optional(),
  imageUrl:      z.string().url('URL inválida').or(z.literal('')).nullable().optional(),
  availableFrom: z.string().nullable().optional(),   // "HH:MM" from <Input type="time">
  availableTo:   z.string().nullable().optional(),
})
export type DishFormInput = z.infer<typeof dishFormSchema>

// Used to construct API request bodies from form output
export interface DishApiPayload {
  name:           string
  salePrice:      number
  categoryId?:    string | null
  description?:   string | null
  imageUrl?:      string | null
  availableFrom?: string | null   // "HH:MM:SS"
  availableTo?:   string | null
}

export const categoryFormSchema = z.object({
  name:       z.string().min(1, 'Requerido').max(80),
  orderIndex: z.number({ message: 'Requerido' }).int().nonnegative(),
})
export type CategoryFormInput = z.infer<typeof categoryFormSchema>

export const cloneDishInputSchema = z.object({
  name: z.string().min(1).max(120).optional(),
})
export type CloneDishInput = z.infer<typeof cloneDishInputSchema>

// ── Combos ────────────────────────────────────────────────────────────────────

export const comboSlotOptionSchema = z.object({
  id:     z.string(),
  slotId: z.string(),
  dishId: z.string(),
})
export type ComboSlotOption = z.infer<typeof comboSlotOptionSchema>

export const comboSlotSchema = z.object({
  id:         z.string(),
  comboId:    z.string(),
  name:       z.string(),
  categoryId: z.string().nullable(),
  required:   z.boolean(),
  orderIndex: z.number(),
  options:    z.array(comboSlotOptionSchema),
})
export type ComboSlot = z.infer<typeof comboSlotSchema>

export const comboSchema = z.object({
  id:            z.string(),
  name:          z.string(),
  description:   z.string().nullable(),
  salePrice:     z.number(),
  active:        z.boolean(),
  availableFrom: z.string().nullable(),
  availableTo:   z.string().nullable(),
  createdAt:     z.coerce.date(),
})
export type Combo = z.infer<typeof comboSchema>

export const comboDetailSchema = comboSchema.extend({
  slots: z.array(comboSlotSchema),
})
export type ComboDetail = z.infer<typeof comboDetailSchema>

export const comboFormSchema = z.object({
  name:          z.string().min(1, 'Requerido').max(120),
  description:   z.string().max(500).nullable().optional(),
  salePrice:     z.number({ message: 'Requerido' }).finite().positive('Debe ser mayor a 0'),
  availableFrom: z.string().nullable().optional(),
  availableTo:   z.string().nullable().optional(),
})
export type ComboFormInput = z.infer<typeof comboFormSchema>

export const slotFormSchema = z.object({
  name:       z.string().min(1, 'Requerido').max(80),
  required:   z.boolean(),
  orderIndex: z.number({ message: 'Requerido' }).int().nonnegative(),
})
export type SlotFormInput = z.infer<typeof slotFormSchema>

// ── DishIngredient (read-only for POS) ───────────────────────────────────────

export const DISH_INGREDIENT_BEHAVIOR = {
  INCLUDED: 'INCLUDED',
  OPTIONAL: 'OPTIONAL',
  EXTRA:    'EXTRA',
} as const
export type DishIngredientBehavior =
  (typeof DISH_INGREDIENT_BEHAVIOR)[keyof typeof DISH_INGREDIENT_BEHAVIOR]

export const dishIngredientForOrderSchema = z.object({
  id:           z.string(),
  dishId:       z.string(),
  ingredientId: z.string(),
  baseQuantity: z.number(),
  behavior:     z.enum([
    DISH_INGREDIENT_BEHAVIOR.INCLUDED,
    DISH_INGREDIENT_BEHAVIOR.OPTIONAL,
    DISH_INGREDIENT_BEHAVIOR.EXTRA,
  ]),
  extraCost:    z.number().nullable(),
  ingredient:   z.object({
    name:            z.string(),
    consumptionUnit: z.string(),
    active:          z.boolean(),
  }),
})
export type DishIngredientForOrder = z.infer<typeof dishIngredientForOrderSchema>

// ── DishIngredient form ───────────────────────────────────────────────────────

export const dishIngredientFormSchema = z.object({
  ingredientId: z.string().min(1, 'Requerido'),
  baseQuantity: z.number({ message: 'Requerido' }).positive('Debe ser mayor a 0'),
  behavior:     z.enum([
    DISH_INGREDIENT_BEHAVIOR.INCLUDED,
    DISH_INGREDIENT_BEHAVIOR.OPTIONAL,
    DISH_INGREDIENT_BEHAVIOR.EXTRA,
  ]),
  extraCost:    z.number().min(0, 'Mínimo 0'),
})
export type DishIngredientFormInput = z.infer<typeof dishIngredientFormSchema>

// ── Ingredients ───────────────────────────────────────────────────────────────

export const ingredientSchema = z.object({
  id:                z.string(),
  name:              z.string(),
  purchaseUnit:      z.string(),
  consumptionUnit:   z.string(),
  conversionFactor:  z.number(),
  wastagePercentage: z.number(),
  active:            z.boolean(),
  createdAt:         z.coerce.date(),
})
export type Ingredient = z.infer<typeof ingredientSchema>

export const ingredientFiltersSchema = z.object({
  activeOnly: z.boolean().optional(),
})
export type IngredientFilters = z.infer<typeof ingredientFiltersSchema>

export const ingredientFormSchema = z.object({
  name:              z.string().min(1, 'Requerido').max(120),
  purchaseUnit:      z.string().min(1, 'Requerido').max(40),
  consumptionUnit:   z.string().min(1, 'Requerido').max(40),
  conversionFactor:  z.number({ message: 'Requerido' }).finite().positive('Debe ser mayor a 0'),
  wastagePercentage: z.number({ message: 'Requerido' }).min(0, 'Mínimo 0').max(100, 'Máximo 100'),
})
export type IngredientFormInput = z.infer<typeof ingredientFormSchema>

// ── Time round-trip helpers ────────────────────────────────────────────────────

/**
 * Converts API time "HH:MM:SS" → "HH:MM" for <Input type="time">.
 * null/undefined/empty → "".
 */
export function timeForInput(value: string | null | undefined): string {
  if (!value) return ''
  return value.length >= 5 ? value.slice(0, 5) : value
}

/**
 * Converts <Input type="time"> "HH:MM" → "HH:MM:00" for the API.
 * "" or null/undefined → null.
 * Already "HH:MM:SS" → unchanged.
 */
export function timeForApi(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.length === 5) return `${value}:00`
  return value
}
