import { z } from 'zod'

// ── Enums ──────────────────────────────────────────────────────────────────────

export const REPORT_STATUS = {
  GREEN:  'GREEN',
  YELLOW: 'YELLOW',
  RED:    'RED',
} as const
export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS]
export const REPORT_STATUS_VALUES = [
  REPORT_STATUS.GREEN,
  REPORT_STATUS.YELLOW,
  REPORT_STATUS.RED,
] as const

// ── Entity schemas ─────────────────────────────────────────────────────────────

export const supplyTransferReportItemSchema = z.object({
  supplyType:           z.string(),
  initialCount:         z.number(),
  soldCount:            z.number(),
  wastageCount:         z.number(),
  theoreticalRemaining: z.number(),
  actualRemaining:      z.number(),
  difference:           z.number(),
  status:               z.enum(REPORT_STATUS_VALUES),
})
export type SupplyTransferReportItem = z.infer<typeof supplyTransferReportItemSchema>

export const supplyTransferReportSchema = z.object({
  branchId:      z.string(),
  date:          z.string(),
  supplyTypes:   z.array(supplyTransferReportItemSchema),
  overallStatus: z.enum(REPORT_STATUS_VALUES),
})
export type SupplyTransferReport = z.infer<typeof supplyTransferReportSchema>

// ── Filters ────────────────────────────────────────────────────────────────────

export const supplyTransferReportFiltersSchema = z.object({
  branchId: z.string().optional(),
  from:     z.string().optional(),
  to:       z.string().optional(),
})
export type SupplyTransferReportFilters = z.infer<typeof supplyTransferReportFiltersSchema>
