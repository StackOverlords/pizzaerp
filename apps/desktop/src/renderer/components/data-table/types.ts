import type { ColumnPinningState, ColumnSizingState, SortingState, VisibilityState } from '@tanstack/react-table'
import type { ComponentType, ReactNode } from 'react'

export const DENSITY = { compact: 'compact', normal: 'normal', comfortable: 'comfortable' } as const
export type DensityMode = (typeof DENSITY)[keyof typeof DENSITY]

export interface ColumnMeta {
  align?: 'left' | 'center' | 'right'
  className?: string
}

export interface ColumnDefConfig<T> {
  id: string
  header: string
  accessorKey?: keyof T & string
  cell?: (row: T, index: number) => ReactNode
  enableSorting?: boolean
  enableResizing?: boolean
  enableHiding?: boolean
  size?: number
  minSize?: number
  maxSize?: number
  pin?: 'left' | 'right'
  meta?: ColumnMeta
}

export interface RowAction<T> {
  label: string
  icon?: ComponentType<{ size?: number; className?: string }>
  onClick: (row: T) => void
  variant?: 'default' | 'destructive'
  disabled?: (row: T) => boolean
  separator?: boolean
}

export interface BulkAction<T> {
  label: string
  icon?: ComponentType<{ size?: number; className?: string }>
  onClick: (rows: T[]) => void
  variant?: 'default' | 'destructive'
}

export interface ServerPagination {
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
  pageSizeOptions?: number[]
}

export interface DataTableProps<T extends object> {
  tableId: string
  columns: ColumnDefConfig<T>[]
  data: T[]
  getRowId?: (row: T) => string

  // Estado
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  emptyMessage?: string
  emptySlot?: ReactNode

  // Paginación
  pagination?: ServerPagination
  clientPagination?: boolean
  defaultPageSize?: number

  // Selección
  selectable?: boolean
  onSelectionChange?: (rows: T[]) => void

  // Acciones por fila
  rowActions?: (row: T) => RowAction<T>[]

  // Acciones masivas
  bulkActions?: BulkAction<T>[]

  // Interacción de fila
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string

  // Expandible
  expandable?: boolean
  renderExpanded?: (row: T) => ReactNode

  // Búsqueda
  searchable?: boolean
  searchPlaceholder?: string
  defaultSearch?: string
  onSearchChange?: (value: string) => void

  // Exportar
  exportable?: boolean
  exportFilename?: string

  // Barra de filtros (encima del toolbar)
  filterBar?: ReactNode

  // Toolbar extra
  toolbar?: ReactNode

  // Apariencia
  defaultDensity?: DensityMode
  stickyHeader?: boolean
  striped?: boolean
}

export interface PersistedTableState {
  columnOrder: string[]
  columnSizing: ColumnSizingState
  columnVisibility: VisibilityState
  columnPinning: ColumnPinningState
  sorting: SortingState
  density: DensityMode
  pageSize: number
}
