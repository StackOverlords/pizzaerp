import { useState, useEffect, Fragment } from 'react'
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type ColumnSizingState,
  type ColumnPinningState,
  type ExpandedState,
  type Header,
  type Row,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Download,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Pin,
  PinOff,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
  AlignJustify,
  Rows3,
  StretchHorizontal,
  ChevronRight as ExpandChevron,
} from 'lucide-react'
import { useTableState } from './useTableState'
import type { DataTableProps, ColumnDefConfig, RowAction, DensityMode } from './types'
import { DENSITY } from './types'

const SPECIAL = new Set(['__select__', '__actions__', '__expand__'])

const DENSITY_ROW: Record<DensityMode, string> = {
  compact:     'h-8  text-xs',
  normal:      'h-10 text-sm',
  comfortable: 'h-14 text-sm',
}

const DENSITY_CELL: Record<DensityMode, string> = {
  compact:     'px-2 py-0.5',
  normal:      'px-3 py-2',
  comfortable: 'px-3 py-3',
}

const DENSITY_ICON: Record<DensityMode, typeof Rows3> = {
  compact:     Rows3,
  normal:      AlignJustify,
  comfortable: StretchHorizontal,
}

const DENSITY_LABEL: Record<DensityMode, string> = {
  compact:     'Compacto',
  normal:      'Normal',
  comfortable: 'Amplio',
}

const PAGE_SIZES = [10, 20, 50, 100]

function toTanstackCols<T extends object>(defs: ColumnDefConfig<T>[]): ColumnDef<T>[] {
  return defs.map((def) => ({
    id: def.id,
    header: def.header,
    ...(def.accessorKey ? { accessorKey: def.accessorKey } : { accessorFn: () => null }),
    cell: def.cell
      ? ({ row }: { row: Row<T> }) => (def.cell as NonNullable<typeof def.cell>)(row.original, row.index)
      : def.accessorKey
        ? ({ row }: { row: Row<T> }) => String((row.original as Record<string, unknown>)[def.accessorKey!] ?? '')
        : () => null,
    enableSorting:  def.enableSorting  ?? true,
    enableResizing: def.enableResizing ?? true,
    enableHiding:   def.enableHiding   ?? true,
    size:    def.size    ?? 150,
    minSize: def.minSize ?? 60,
    maxSize: def.maxSize ?? 600,
    meta:    def.meta,
  }))
}

function exportCSV<T extends object>(defs: ColumnDefConfig<T>[], data: T[], filename: string) {
  const cols = defs.filter((d) => d.accessorKey)
  const headers = cols.map((d) => d.header)
  const rows = data.map((row) =>
    cols.map((d) => {
      const val = d.accessorKey ? (row as Record<string, unknown>)[d.accessorKey] : ''
      return `"${String(val ?? '').replace(/"/g, '""')}"`
    })
  )
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename || 'export'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function DraggableHeader<T extends object>({
  header,
  density,
}: {
  header: Header<T, unknown>
  density: DensityMode
}) {
  const col = header.column
  const isSpecial = SPECIAL.has(col.id)
  const isPinned = col.getIsPinned()
  const meta = col.columnDef.meta as { align?: string } | undefined
  const align = meta?.align ?? 'left'

  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: col.id,
    disabled: isSpecial,
  })

  const pinStyle: React.CSSProperties = isPinned
    ? {
        position: 'sticky',
        left:  isPinned === 'left'  ? `${col.getStart('left')}px`  : undefined,
        right: isPinned === 'right' ? `${col.getAfter('right')}px` : undefined,
        zIndex: 3,
      }
    : {}

  const style: React.CSSProperties = {
    width: header.getSize(),
    transform: CSS.Transform.toString(transform ? { ...transform, scaleY: 1 } : null),
    transition: isDragging ? undefined : 'transform 150ms ease',
    opacity: isDragging ? 0.85 : 1,
    ...pinStyle,
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative border-b border-r last:border-r-0 bg-muted/50 select-none group/th',
        density === 'compact' ? 'h-8 text-xs' : 'h-10 text-xs',
        isDragging && 'bg-accent z-10',
        isPinned && 'bg-muted/70',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1 px-2 font-medium text-muted-foreground',
          align === 'center' && 'justify-center',
          align === 'right'  && 'justify-end',
        )}
      >
        {/* Drag handle */}
        {!isSpecial && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing opacity-30 hover:opacity-70 shrink-0 -ml-1 p-0.5"
            tabIndex={-1}
          >
            <GripVertical size={12} />
          </button>
        )}

        {/* Header label + sort */}
        {!header.isPlaceholder && (
          <span
            className={cn(
              'flex-1 truncate leading-none',
              col.getCanSort() && 'cursor-pointer hover:text-foreground transition-colors',
            )}
            onClick={col.getCanSort() ? col.getToggleSortingHandler() : undefined}
          >
            {flexRender(col.columnDef.header, header.getContext())}
          </span>
        )}

        {col.getCanSort() && (
          <span className="shrink-0 text-muted-foreground/60">
            {col.getIsSorted() === 'asc'  ? <ArrowUp size={11} /> :
             col.getIsSorted() === 'desc' ? <ArrowDown size={11} /> :
             <ArrowUpDown size={11} className="opacity-40" />}
          </span>
        )}

        {/* Column options dropdown */}
        {!isSpecial && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="h-5 w-5 inline-flex items-center justify-center rounded opacity-0 group-hover/th:opacity-100 transition-opacity shrink-0 hover:bg-accent/80"
            >
              <ChevronDown size={10} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {col.getCanSort() && (
                <>
                  <DropdownMenuItem onClick={() => col.toggleSorting(false)}>
                    <ArrowUp size={13} className="mr-2 shrink-0" /> Ordenar A → Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => col.toggleSorting(true)}>
                    <ArrowDown size={13} className="mr-2 shrink-0" /> Ordenar Z → A
                  </DropdownMenuItem>
                  {col.getIsSorted() && (
                    <DropdownMenuItem onClick={() => col.clearSorting()}>
                      <ArrowUpDown size={13} className="mr-2 shrink-0" /> Quitar orden
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}
              {isPinned ? (
                <DropdownMenuItem onClick={() => col.pin(false)}>
                  <PinOff size={13} className="mr-2 shrink-0" /> Desanclar
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => col.pin('left')}>
                    <Pin size={13} className="mr-2 shrink-0" /> Anclar izquierda
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => col.pin('right')}>
                    <Pin size={13} className="mr-2 shrink-0" /> Anclar derecha
                  </DropdownMenuItem>
                </>
              )}
              {col.getCanHide() && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => col.toggleVisibility(false)}>
                    <EyeOff size={13} className="mr-2 shrink-0" /> Ocultar columna
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Resize handle */}
      {col.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={cn(
            'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none',
            'bg-transparent hover:bg-primary/40 transition-colors',
            col.getIsResizing() && 'bg-primary',
          )}
        />
      )}
    </th>
  )
}

function RowActionsMenu<T extends object>({ row, actions }: { row: T; actions: RowAction<T>[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <MoreHorizontal size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {actions.map((action, i) => (
          <Fragment key={i}>
            {action.separator && i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={action.disabled?.(row)}
              onClick={() => action.onClick(row)}
              className={action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}
            >
              {action.icon && <action.icon size={13} className="mr-2 shrink-0" />}
              {action.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function pinnedStyle(col: {
  getIsPinned: () => false | 'left' | 'right'
  getStart:    (s: 'left')  => number
  getAfter:    (s: 'right') => number
}): React.CSSProperties {
  const pin = col.getIsPinned()
  if (!pin) return {}
  return {
    position: 'sticky',
    left:  pin === 'left'  ? `${col.getStart('left')}px`  : undefined,
    right: pin === 'right' ? `${col.getAfter('right')}px` : undefined,
    zIndex: 1,
  }
}

export function DataTable<T extends object>({
  tableId,
  columns: columnDefs,
  data,
  getRowId,

  isLoading,
  isError,
  errorMessage = 'Error al cargar los datos.',
  emptyMessage = 'Sin resultados.',
  emptySlot,

  pagination: serverPagination,
  clientPagination,
  defaultPageSize,

  selectable,
  onSelectionChange,

  rowActions,
  bulkActions,

  onRowClick,
  rowClassName,

  expandable,
  renderExpanded,

  searchable,
  searchPlaceholder = 'Buscar...',
  defaultSearch = '',
  onSearchChange,

  exportable,
  exportFilename,

  filterBar,
  toolbar,

  defaultDensity,
  stickyHeader,
  striped,
}: DataTableProps<T>) {
  const { state: ts, persist, reset, isLoaded } = useTableState(tableId, defaultDensity, defaultPageSize)

  const [rowSelection,      setRowSelection]      = useState<RowSelectionState>({})
  const [globalFilter,      setGlobalFilter]      = useState(defaultSearch)
  const [expanded,          setExpanded]          = useState<ExpandedState>({})
  const [sorting,           setSorting]           = useState<SortingState>([])
  const [columnVisibility,  setColumnVisibility]  = useState<VisibilityState>({})
  const [columnSizing,      setColumnSizing]      = useState<ColumnSizingState>({})
  const [columnOrder,       setColumnOrder]       = useState<string[]>([])
  const [columnPinning,     setColumnPinning]     = useState<ColumnPinningState>(() => ({
    left:  columnDefs.filter((d) => d.pin === 'left').map((d) => d.id),
    right: columnDefs.filter((d) => d.pin === 'right').map((d) => d.id),
  }))
  const [density,           setDensity]           = useState<DensityMode>(defaultDensity ?? 'normal')
  const [pageSize,          setPageSize]          = useState(defaultPageSize ?? 20)
  const [clientPage,        setClientPage]        = useState(0)

  // Load persisted state after storage resolves
  useEffect(() => {
    if (!isLoaded) return
    setSorting(ts.sorting)
    setColumnVisibility(ts.columnVisibility)
    setColumnSizing(ts.columnSizing)
    setColumnOrder(ts.columnOrder)
    setColumnPinning(ts.columnPinning)
    setDensity(ts.density)
    setPageSize(ts.pageSize)
  }, [isLoaded])

  // Persist each state slice on change
  useEffect(() => { if (isLoaded) persist({ sorting }) },          [sorting])
  useEffect(() => { if (isLoaded) persist({ columnVisibility }) }, [columnVisibility])
  useEffect(() => { if (isLoaded) persist({ columnSizing }) },     [columnSizing])
  useEffect(() => { if (isLoaded) persist({ columnOrder }) },      [columnOrder])
  useEffect(() => { if (isLoaded) persist({ columnPinning }) },    [columnPinning])
  useEffect(() => { if (isLoaded) persist({ density }) },          [density])
  useEffect(() => { if (isLoaded) persist({ pageSize }) },         [pageSize])

  // Build column definitions
  const builtCols = toTanstackCols(columnDefs)

  const selectCol: ColumnDef<T> = {
    id: '__select__',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Seleccionar todo"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Seleccionar fila"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false, enableResizing: false, enableHiding: false,
    size: 40, minSize: 40, maxSize: 40,
  }

  const actionsCol: ColumnDef<T> = {
    id: '__actions__',
    header: '',
    cell: ({ row }) => rowActions
      ? <RowActionsMenu row={row.original} actions={rowActions(row.original)} />
      : null,
    enableSorting: false, enableResizing: false, enableHiding: false,
    size: 48, minSize: 48, maxSize: 48,
  }

  const expandCol: ColumnDef<T> = {
    id: '__expand__',
    header: '',
    cell: ({ row }) => row.getCanExpand() ? (
      <button
        className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent transition-colors"
        onClick={(e) => { e.stopPropagation(); row.toggleExpanded() }}
      >
        <ExpandChevron size={13} className={cn('transition-transform', row.getIsExpanded() && 'rotate-90')} />
      </button>
    ) : null,
    enableSorting: false, enableResizing: false, enableHiding: false,
    size: 40, minSize: 40, maxSize: 40,
  }

  const allCols: ColumnDef<T>[] = [
    ...(selectable ? [selectCol]  : []),
    ...(expandable ? [expandCol]  : []),
    ...builtCols,
    ...(rowActions ? [actionsCol] : []),
  ]

  const useServerPagination = !!serverPagination
  const useClientPagination = !useServerPagination && !!clientPagination
  const effectiveOrder = columnOrder.length ? columnOrder : allCols.map((c) => c.id!)

  const table = useReactTable<T>({
    data,
    columns: allCols,
    state: {
      sorting,
      columnVisibility,
      columnSizing,
      columnOrder: effectiveOrder,
      columnPinning,
      rowSelection,
      globalFilter,
      expanded,
      ...(useClientPagination ? { pagination: { pageIndex: clientPage, pageSize } } : {}),
    },
    columnResizeMode: 'onChange',
    enableRowSelection:      !!selectable,
    enableMultiRowSelection: !!selectable,
    getRowId,
    getRowCanExpand: expandable ? () => true : undefined,
    onSortingChange:          (u) => setSorting(u instanceof Function ? u(sorting) : u),
    onColumnVisibilityChange: (u) => setColumnVisibility(u instanceof Function ? u(columnVisibility) : u),
    onColumnSizingChange:     (u) => setColumnSizing(u instanceof Function ? u(columnSizing) : u),
    onColumnOrderChange:      (u) => setColumnOrder(u instanceof Function ? u(effectiveOrder) : u),
    onColumnPinningChange:    (u) => setColumnPinning(u instanceof Function ? u(columnPinning) : u),
    onRowSelectionChange:     (u) => setRowSelection(u instanceof Function ? u(rowSelection) : u),
    onGlobalFilterChange:     setGlobalFilter,
    onExpandedChange:         (u) => setExpanded(u instanceof Function ? u(expanded) : u),
    ...(useClientPagination ? {
      onPaginationChange: (u) => {
        const next = u instanceof Function ? u({ pageIndex: clientPage, pageSize }) : u
        setClientPage(next.pageIndex)
        setPageSize(next.pageSize)
      },
      getPaginationRowModel: getPaginationRowModel(),
    } : {}),
    getCoreRowModel:     getCoreRowModel(),
    getSortedRowModel:   getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: expandable ? getExpandedRowModel() : undefined,
    manualPagination:    useServerPagination,
    ...(useServerPagination ? { rowCount: serverPagination.total } : {}),
  })

  // Fire selection callback
  useEffect(() => {
    if (!onSelectionChange) return
    onSelectionChange(table.getSelectedRowModel().rows.map((r) => r.original))
  }, [rowSelection])

  // Keep special columns pinned
  useEffect(() => {
    const left  = [
      ...(selectable ? ['__select__'] : []),
      ...(expandable ? ['__expand__'] : []),
      ...(columnPinning.left?.filter((id) => !SPECIAL.has(id)) ?? []),
    ]
    const right = [
      ...(columnPinning.right?.filter((id) => !SPECIAL.has(id)) ?? []),
      ...(rowActions ? ['__actions__'] : []),
    ]
    table.setColumnPinning({ left, right })
  }, [selectable, expandable, !!rowActions])

  // DnD setup
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const draggableIds = effectiveOrder.filter((id) => !SPECIAL.has(id))

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!active || !over || active.id === over.id) return
    const order = table.getState().columnOrder
    const oldIdx = order.indexOf(active.id as string)
    const newIdx = order.indexOf(over.id as string)
    if (oldIdx !== -1 && newIdx !== -1) setColumnOrder(arrayMove(order, oldIdx, newIdx))
  }

  function handleDragEnd() {
    // columnOrder already updated in real-time via handleDragOver
  }

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original)
  const hasSelection  = selectedRows.length > 0
  const DensityIcon   = DENSITY_ICON[density]

  const visibleUserCols = table.getAllLeafColumns().filter((c) => !SPECIAL.has(c.id) && c.getCanHide())

  const { rows } = useServerPagination
    ? table.getRowModel()
    : useClientPagination
      ? table.getPaginationRowModel()
      : table.getRowModel()

  function handleReset() {
    reset()
    setSorting([])
    setColumnVisibility({})
    setColumnSizing({})
    setColumnOrder([])
    setColumnPinning({
      left:  columnDefs.filter((d) => d.pin === 'left').map((d) => d.id),
      right: columnDefs.filter((d) => d.pin === 'right').map((d) => d.id),
    })
    setDensity(defaultDensity ?? 'normal')
    setPageSize(defaultPageSize ?? 20)
    setGlobalFilter('')
    setRowSelection({})
    setClientPage(0)
  }

  return (
    <div className="flex flex-col gap-2">

      {/* ── Filter bar ── */}
      {filterBar && (
        <div className="flex items-center gap-2 flex-wrap rounded-md border border-border/60 bg-muted/20 px-3 py-1.5">
          <span className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80 pr-0.5">
            <SlidersHorizontal size={11} />
            Filtros
          </span>
          <Separator orientation="vertical" className="h-4 shrink-0" />
          {filterBar}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Left: search + selection info + bulk actions */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {searchable && (
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => {
                  setGlobalFilter(e.target.value)
                  onSearchChange?.(e.target.value)
                }}
                className="pl-8 h-8 text-sm"
              />
              {globalFilter && (
                <button
                  onClick={() => { setGlobalFilter(''); onSearchChange?.('') }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {selectable && hasSelection && (
            <>
              <Badge variant="secondary" className="shrink-0">
                {selectedRows.length} seleccionado{selectedRows.length !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost" size="sm"
                className="h-8 px-2 text-xs text-muted-foreground"
                onClick={() => table.resetRowSelection()}
              >
                <X size={11} className="mr-1" /> Limpiar
              </Button>
              {bulkActions?.map((action, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                  className="h-8 text-xs"
                  onClick={() => action.onClick(selectedRows)}
                >
                  {action.icon && <action.icon size={13} className="mr-1.5" />}
                  {action.label}
                </Button>
              ))}
            </>
          )}
        </div>

        {/* Right: toolbar slot + controls */}
        <div className="flex items-center gap-1 shrink-0">
          {toolbar}
          {toolbar && <Separator orientation="vertical" className="h-5 mx-1" />}

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger
              title="Columnas visibles"
              className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
            >
              <Columns3 size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 max-h-72 overflow-y-auto">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs">Columnas visibles</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {visibleUserCols.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(v)}
                    className="text-sm"
                  >
                    {String(col.columnDef.header ?? col.id)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Density */}
          <DropdownMenu>
            <DropdownMenuTrigger
              title="Densidad de filas"
              className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
            >
              <DensityIcon size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs">Densidad</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={density} onValueChange={(v) => setDensity(v as DensityMode)}>
                  {(Object.keys(DENSITY) as DensityMode[]).map((d) => {
                    const Icon = DENSITY_ICON[d]
                    return (
                      <DropdownMenuRadioItem key={d} value={d} className="text-sm">
                        <Icon size={13} className="mr-2 shrink-0" />
                        {DENSITY_LABEL[d]}
                      </DropdownMenuRadioItem>
                    )
                  })}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          {exportable && (
            <Tooltip>
              <TooltipTrigger
                className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
                onClick={() => exportCSV(columnDefs, data, exportFilename || tableId)}
              >
                <Download size={14} />
              </TooltipTrigger>
              <TooltipContent>Exportar CSV</TooltipContent>
            </Tooltip>
          )}

          {/* Reset */}
          <Tooltip>
            <TooltipTrigger
              className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
              onClick={handleReset}
            >
              <RotateCcw size={14} />
            </TooltipTrigger>
            <TooltipContent>Restablecer tabla</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ── Table ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-auto">
          <table
            className="border-collapse"
            style={{ width: `max(${table.getTotalSize()}px, 100%)` }}
          >
            <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
              {table.getHeaderGroups().map((hg) => (
                <SortableContext key={hg.id} items={draggableIds} strategy={horizontalListSortingStrategy}>
                  <tr>
                    {hg.headers.map((header) => (
                      <DraggableHeader key={header.id} header={header} density={density} />
                    ))}
                  </tr>
                </SortableContext>
              ))}
            </thead>

            <tbody>
              {/* Loading skeleton */}
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className={cn(DENSITY_ROW[density], striped && i % 2 === 1 && 'bg-muted/20')}>
                  {table.getVisibleLeafColumns().map((col) => (
                    <td key={col.id} className={cn(DENSITY_CELL[density], 'border-b border-r last:border-r-0')}>
                      <Skeleton className="h-3 w-full" />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Error state */}
              {!isLoading && isError && (
                <tr>
                  <td colSpan={table.getVisibleLeafColumns().length} className="py-10 text-center text-sm text-destructive">
                    {errorMessage}
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!isLoading && !isError && rows.length === 0 && (
                <tr>
                  <td colSpan={table.getVisibleLeafColumns().length} className="py-12 text-center text-sm text-muted-foreground">
                    {emptySlot ?? emptyMessage}
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!isLoading && !isError && rows.map((row: Row<T>, rowIdx) => (
                <Fragment key={row.id}>
                  <tr
                    className={cn(
                      DENSITY_ROW[density],
                      'border-b transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-accent/50',
                      !onRowClick && 'hover:bg-muted/20',
                      row.getIsSelected() && 'bg-primary/5',
                      striped && rowIdx % 2 === 1 && 'bg-muted/20',
                      rowClassName?.(row.original),
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const col   = cell.column
                      const pin   = col.getIsPinned()
                      const cMeta = col.columnDef.meta as { align?: string; className?: string } | undefined

                      return (
                        <td
                          key={cell.id}
                          style={{ width: col.getSize(), ...pinnedStyle(col) }}
                          className={cn(
                            DENSITY_CELL[density],
                            'border-r last:border-r-0',
                            pin && 'bg-[inherit]',
                            cMeta?.align === 'center' && 'text-center',
                            cMeta?.align === 'right'  && 'text-right',
                            cMeta?.className,
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Expanded content */}
                  {expandable && row.getIsExpanded() && renderExpanded && (
                    <tr className="border-b bg-muted/20">
                      <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-3">
                        {renderExpanded(row.original)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </DndContext>

      {/* ── Pagination ── */}
      {(useServerPagination || useClientPagination) && (() => {
        const totalFiltered = useClientPagination ? table.getFilteredRowModel().rows.length : serverPagination!.total
        const currentPage   = useServerPagination ? serverPagination!.page - 1 : table.getState().pagination.pageIndex
        const effectiveSize = useServerPagination ? serverPagination!.limit : pageSize
        const totalPages    = Math.ceil(totalFiltered / effectiveSize)
        const canPrev       = currentPage > 0
        const canNext       = currentPage < totalPages - 1
        const from          = currentPage * effectiveSize + 1
        const to            = Math.min((currentPage + 1) * effectiveSize, totalFiltered)

        const goFirst = () => useServerPagination ? serverPagination!.onPageChange(1)            : table.firstPage()
        const goPrev  = () => useServerPagination ? serverPagination!.onPageChange(currentPage)  : table.previousPage()
        const goNext  = () => useServerPagination ? serverPagination!.onPageChange(currentPage + 2) : table.nextPage()
        const goLast  = () => useServerPagination ? serverPagination!.onPageChange(totalPages)   : table.lastPage()

        return (
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
            <span>{from}–{to} de {totalFiltered}</span>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger className="h-7 px-2 inline-flex items-center gap-1 rounded-md border border-input bg-background text-xs hover:bg-accent transition-colors">
                  {effectiveSize} / pág <ChevronDown size={10} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-24">
                  {(serverPagination?.pageSizeOptions ?? PAGE_SIZES).map((size) => (
                    <DropdownMenuItem
                      key={size}
                      onClick={() => {
                        setPageSize(size)
                        serverPagination?.onLimitChange?.(size)
                        setClientPage(0)
                      }}
                      className={cn('text-xs', size === effectiveSize && 'font-medium')}
                    >
                      {size} filas
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {([
                { icon: ChevronsLeft,  label: 'Primera',  disabled: !canPrev, fn: goFirst },
                { icon: ChevronLeft,   label: 'Anterior', disabled: !canPrev, fn: goPrev  },
                { icon: ChevronRight,  label: 'Siguiente',disabled: !canNext, fn: goNext  },
                { icon: ChevronsRight, label: 'Última',   disabled: !canNext, fn: goLast  },
              ] as const).map(({ icon: Icon, label, disabled, fn }) => (
                <Tooltip key={label}>
                  <TooltipTrigger
                    className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-7')}
                    disabled={disabled}
                    onClick={fn}
                  >
                    <Icon size={12} />
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
