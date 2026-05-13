import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { DataTable, FilterBar, defineColumns, defineFilters } from '@/components/data-table'
import { formatCurrency } from '@/lib/format'
import { useShiftHistory, useStaffOptions } from '../api'
import { shiftHistoryFiltersSchema, type ShiftHistoryFilters, type ShiftWithClosure } from '../schemas'

function DiffBadge({ value }: { value: number }) {
  return (
    <Badge
      variant={value === 0 ? 'secondary' : 'destructive'}
      className={value === 0 ? 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400' : ''}
    >
      {value >= 0 ? `+${value}` : String(value)}
    </Badge>
  )
}

const DEFAULT_FILTERS = shiftHistoryFiltersSchema.parse({})

export function ShiftHistoryTable() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<ShiftHistoryFilters>(DEFAULT_FILTERS)
  const { data, isLoading, isError } = useShiftHistory(filters)

  const columns = defineColumns<ShiftWithClosure>([
    {
      id: 'cashierUsername',
      header: t('shifts.history.columns.cashier'),
      accessorKey: 'cashierUsername',
      size: 160,
    },
    {
      id: 'openedAt',
      header: t('shifts.history.columns.openedAt'),
      cell: (row) => format(row.openedAt, 'dd/MM/yyyy HH:mm'),
      size: 150,
    },
    {
      id: 'closedAt',
      header: t('shifts.history.columns.closedAt'),
      cell: (row) => row.closedAt ? format(row.closedAt, 'dd/MM/yyyy HH:mm') : '—',
      size: 150,
    },
    {
      id: 'declaredCash',
      header: t('shifts.history.columns.declaredCash'),
      cell: (row) => formatCurrency(row.closure?.declaredCash ?? row.initialCash),
      meta: { align: 'right' },
      size: 160,
    },
    {
      id: 'cashDifference',
      header: t('shifts.history.columns.cashDifference'),
      cell: (row) => row.closure ? <DiffBadge value={row.closure.cashDifference} /> : '—',
      meta: { align: 'center' },
      size: 120,
      enableSorting: false,
    },
    {
      id: 'qrCountDifference',
      header: t('shifts.history.columns.qrCountDifference'),
      cell: (row) => row.closure ? <DiffBadge value={row.closure.qrCountDifference} /> : '—',
      meta: { align: 'center' },
      size: 100,
      enableSorting: false,
    },
  ])

  const filterDefs = defineFilters<ShiftHistoryFilters>([
    {
      id: 'closedAt',
      type: 'daterange',
      label: t('shifts.history.filters.closedAt'),
      fromKey: 'from',
      toKey: 'to',
    },
    {
      id: 'userId',
      type: 'asyncselect',
      label: t('shifts.history.filters.cashier'),
      useOptions: useStaffOptions,
    },
  ])

  function handleFilterChange(update: Partial<ShiftHistoryFilters>) {
    setFilters((prev) => ({ ...prev, ...update, page: 1 }))
  }

  return (
    <DataTable
      tableId="shifts-history"
      columns={columns}
      data={data?.data ?? []}
      isLoading={isLoading}
      isError={isError}
      emptyMessage={t('shifts.history.empty')}
      exportable
      exportFilename="historial-turnos"
      stickyHeader
      filterBar={
        <FilterBar
          defs={filterDefs}
          values={filters}
          onChange={handleFilterChange}
        />
      }
      pagination={{
        page:  filters.page,
        limit: filters.limit,
        total: data?.total ?? 0,
        onPageChange:  (page)  => setFilters((f) => ({ ...f, page })),
        onLimitChange: (limit) => setFilters((f) => ({ ...f, limit, page: 1 })),
      }}
    />
  )
}
