import { z } from 'zod'

// ── Enums ──────────────────────────────────────────────────────────────────────

export const WASTAGE_REASON = {
  FELL:          'FELL',
  BAD_SHAPE:     'BAD_SHAPE',
  BURNED:        'BURNED',
  CONTAMINATED:  'CONTAMINATED',
  OTHER:         'OTHER',
} as const
export type WastageReason = (typeof WASTAGE_REASON)[keyof typeof WASTAGE_REASON]
export const WASTAGE_REASON_VALUES = [
  WASTAGE_REASON.FELL,
  WASTAGE_REASON.BAD_SHAPE,
  WASTAGE_REASON.BURNED,
  WASTAGE_REASON.CONTAMINATED,
  WASTAGE_REASON.OTHER,
] as const

export const WASTAGE_REASON_LABELS: Record<WastageReason, string> = {
  FELL:         'Se cayó',
  BAD_SHAPE:    'Mal estado',
  BURNED:       'Quemado',
  CONTAMINATED: 'Contaminado',
  OTHER:        'Otro',
}

export const TRANSFER_STATUS = {
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED:   'RECEIVED',
} as const
export type TransferStatus = (typeof TRANSFER_STATUS)[keyof typeof TRANSFER_STATUS]
export const TRANSFER_STATUS_VALUES = [
  TRANSFER_STATUS.IN_TRANSIT,
  TRANSFER_STATUS.RECEIVED,
] as const

// ── Entity schemas ─────────────────────────────────────────────────────────────

export const supplyTypeSchema = z.object({
  id:        z.string(),
  name:      z.string(),
  active:    z.boolean(),
  createdAt: z.coerce.date(),
})
export type SupplyType = z.infer<typeof supplyTypeSchema>

export const supplyTransferItemSchema = z.object({
  id:               z.string(),
  transferId:       z.string(),
  supplyType:       z.string(),
  quantitySent:     z.number(),
  quantityReceived: z.number().nullable(),
  notes:            z.string().nullable(),
})
export type SupplyTransferItem = z.infer<typeof supplyTransferItemSchema>

export const supplyTransferSchema = z.object({
  id:           z.string(),
  fromBranchId: z.string(),
  toBranchId:   z.string(),
  sentByUserId: z.string(),
  status:       z.enum(TRANSFER_STATUS_VALUES),
  transferDate: z.string(),
  notes:        z.string().nullable(),
  sentAt:       z.coerce.date(),
  receivedAt:   z.coerce.date().nullable(),
  items:        z.array(supplyTransferItemSchema),
})
export type SupplyTransfer = z.infer<typeof supplyTransferSchema>

export const supplyWastageSchema = z.object({
  id:         z.string(),
  branchId:   z.string(),
  userId:     z.string(),
  supplyType: z.string(),
  quantity:   z.number(),
  reason:     z.enum(WASTAGE_REASON_VALUES),
  notes:      z.string().nullable(),
  recordedAt: z.coerce.date(),
})
export type SupplyWastage = z.infer<typeof supplyWastageSchema>

export const supplyClosureSchema = z.object({
  id:                  z.string(),
  branchId:            z.string(),
  closureDate:         z.string(),
  supplyType:          z.string(),
  initialCount:        z.number(),
  soldCount:           z.number(),
  wastageCount:        z.number(),
  theoreticalRemaining: z.number(),
  actualRemaining:     z.number(),
  difference:          z.number(),
  notes:               z.string().nullable(),
  closedByUserId:      z.string(),
  closedAt:            z.coerce.date(),
})
export type SupplyClosure = z.infer<typeof supplyClosureSchema>

export const supplyClosingSummaryItemSchema = z.object({
  supplyType:    z.string(),
  initialCount:  z.number(),
  wastageCount:  z.number(),
})
export type SupplyClosingSummaryItem = z.infer<typeof supplyClosingSummaryItemSchema>

// ── Filters ────────────────────────────────────────────────────────────────────

export const supplyTransferFiltersSchema = z.object({
  status: z.enum(TRANSFER_STATUS_VALUES).optional(),
  from:   z.string().optional(),
  to:     z.string().optional(),
})
export type SupplyTransferFilters = z.infer<typeof supplyTransferFiltersSchema>

export const supplyWastageFiltersSchema = z.object({
  from: z.string().optional(),
  to:   z.string().optional(),
})
export type SupplyWastageFilters = z.infer<typeof supplyWastageFiltersSchema>

export const supplyClosingFiltersSchema = z.object({
  from: z.string().optional(),
  to:   z.string().optional(),
})
export type SupplyClosingFilters = z.infer<typeof supplyClosingFiltersSchema>

// ── Form input schemas ─────────────────────────────────────────────────────────

export const supplyTypeFormSchema = z.object({
  name: z.string().min(1, 'Requerido').max(120),
})
export type SupplyTypeFormInput = z.infer<typeof supplyTypeFormSchema>

export const supplyTransferItemFormSchema = z.object({
  supplyType:   z.string().min(1, 'Requerido'),
  quantitySent: z.number({ message: 'Requerido' }).positive('Debe ser mayor a 0'),
  notes:        z.string().optional(),
})
export type SupplyTransferItemFormInput = z.infer<typeof supplyTransferItemFormSchema>

export const createTransferFormSchema = z.object({
  toBranchId:    z.string().min(1, 'Requerido'),
  transferDate:  z.string().min(1, 'Requerido'),
  notes:         z.string().optional(),
  items:         z.array(supplyTransferItemFormSchema).min(1, 'Debe agregar al menos un ítem'),
})
export type CreateTransferFormInput = z.infer<typeof createTransferFormSchema>

export const receiveTransferItemFormSchema = z.object({
  supplyType:       z.string(),
  quantityReceived: z.number({ message: 'Requerido' }).min(0, 'Debe ser 0 o mayor'),
})
export type ReceiveTransferItemFormInput = z.infer<typeof receiveTransferItemFormSchema>

export const receiveTransferFormSchema = z.object({
  notes: z.string().optional(),
  items: z.array(receiveTransferItemFormSchema),
})
export type ReceiveTransferFormInput = z.infer<typeof receiveTransferFormSchema>

export const logWastageFormSchema = z.object({
  supplyType: z.string().min(1, 'Requerido'),
  quantity:   z.number({ message: 'Requerido' }).int().min(1, 'Debe ser al menos 1'),
  reason:     z.enum(WASTAGE_REASON_VALUES, { message: 'Requerido' }),
  notes:      z.string().optional(),
})
export type LogWastageFormInput = z.infer<typeof logWastageFormSchema>

export const closeSupplyDayFormSchema = z.object({
  closureDate:    z.string().min(1, 'Requerido'),
  supplyType:     z.string().min(1, 'Requerido'),
  soldCount:      z.number({ message: 'Requerido' }).min(0, 'Debe ser 0 o mayor'),
  actualRemaining: z.number({ message: 'Requerido' }).min(0, 'Debe ser 0 o mayor'),
  notes:          z.string().optional(),
})
export type CloseSupplyDayFormInput = z.infer<typeof closeSupplyDayFormSchema>
