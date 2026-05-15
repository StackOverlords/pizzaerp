import { z } from 'zod'

export const CASH_MOVEMENT_TYPE = {
  INGRESO: 'INGRESO',
  RETIRO:  'RETIRO',
} as const
export type CashMovementType = (typeof CASH_MOVEMENT_TYPE)[keyof typeof CASH_MOVEMENT_TYPE]

export const cashMovementSchema = z.object({
  id:              z.string(),
  shiftId:         z.string(),
  type:            z.enum([CASH_MOVEMENT_TYPE.INGRESO, CASH_MOVEMENT_TYPE.RETIRO]),
  amount:          z.number(),
  reason:          z.string(),
  createdByUserId: z.string(),
  createdAt:       z.coerce.date(),
})
export type CashMovement = z.infer<typeof cashMovementSchema>

export const createCashMovementInputSchema = z.object({
  type:   z.enum([CASH_MOVEMENT_TYPE.INGRESO, CASH_MOVEMENT_TYPE.RETIRO]),
  amount: z.number({ error: 'Requerido' }).finite().positive('Debe ser mayor a 0'),
  reason: z.string().trim().min(1, 'Requerido').max(200, 'Máximo 200 caracteres'),
})
export type CreateCashMovementInput = z.infer<typeof createCashMovementInputSchema>

export const SHIFT_STATUS = { OPEN: 'OPEN', CLOSED: 'CLOSED' } as const
export type ShiftStatus = (typeof SHIFT_STATUS)[keyof typeof SHIFT_STATUS]

export const shiftSchema = z.object({
  id:          z.string(),
  branchId:    z.string(),
  userId:      z.string(),
  openedAt:    z.coerce.date(),
  closedAt:    z.coerce.date().nullable(),
  initialCash: z.number(),
  status:      z.enum([SHIFT_STATUS.OPEN, SHIFT_STATUS.CLOSED]),
})
export type Shift = z.infer<typeof shiftSchema>

export const closureSchema = z.object({
  id:               z.string(),
  shiftId:          z.string(),
  declaredCash:     z.number(),
  declaredQrCount:  z.number().int(),
  expectedCash:     z.number(),
  expectedQrTotal:  z.number(),
  expectedQrCount:  z.number().int(),
  cashDifference:   z.number(),
  qrCountDifference: z.number().int(),
  notes:            z.string().nullable(),
  closedAt:         z.coerce.date(),
})
export type Closure = z.infer<typeof closureSchema>

// Note: HTML inputs with type="number" and valueAsNumber:true return number | NaN.
// We use z.number() + .nonnegative() — RHF's register({ valueAsNumber: true }) handles the coercion.
export const openShiftInputSchema = z.object({
  initialCash: z.number({ error: 'Requerido' }).finite().nonnegative('No puede ser negativo'),
})
export type OpenShiftInput = z.infer<typeof openShiftInputSchema>

export const closeShiftInputSchema = z.object({
  declaredCash:    z.number({ error: 'Requerido' }).finite().nonnegative('No puede ser negativo'),
  declaredQrCount: z.number({ error: 'Requerido' }).int('Debe ser un número entero').nonnegative('No puede ser negativo'),
  notes:           z.string().max(500, 'Máximo 500 caracteres').optional(),
})
export type CloseShiftInput = z.infer<typeof closeShiftInputSchema>

export const closeShiftResponseSchema = z.object({
  shift:   shiftSchema,
  closure: closureSchema,
})
export type CloseShiftResponse = z.infer<typeof closeShiftResponseSchema>

export const shiftHistoryFiltersSchema = z.object({
  page:   z.number().int().positive().default(1),
  limit:  z.number().int().positive().max(100).default(20),
  from:   z.string().optional(),
  to:     z.string().optional(),
  userId: z.string().optional(),
})
export type ShiftHistoryFilters = z.infer<typeof shiftHistoryFiltersSchema>

export const shiftWithClosureSchema = shiftSchema.extend({
  cashierUsername: z.string(),
  closure:         closureSchema.nullable(),
})
export type ShiftWithClosure = z.infer<typeof shiftWithClosureSchema>

export const shiftHistoryPageSchema = z.object({
  data:  z.array(shiftWithClosureSchema),
  total: z.number().int().nonnegative(),
  page:  z.number().int().positive(),
  limit: z.number().int().positive(),
})
export type ShiftHistoryPage = z.infer<typeof shiftHistoryPageSchema>
