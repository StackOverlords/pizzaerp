import { useState } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { DataTable, FilterBar, defineColumns, defineFilters } from '@/components/data-table'
import { formatCurrency } from '@/lib/format'
import { eventBus } from '@/core/events/event-bus'
import { useAuthStore } from '@/core/auth/store'
import { useOrders, useStaffOptions } from '../api'
import { orderFiltersSchema, ORDER_STATUS, type OrderHeader, type OrderFilters } from '../schemas'

function StatusBadge({ status }: { status: string }) {
  if (status === ORDER_STATUS.PAID) {
    return (
      <Badge
        variant="outline"
        className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
      >
        Cobrado
      </Badge>
    )
  }
  if (status === ORDER_STATUS.CANCELLED) {
    return <Badge variant="destructive">Cancelado</Badge>
  }
  return (
    <Badge
      variant="secondary"
      className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
    >
      Pendiente
    </Badge>
  )
}

const DEFAULT_FILTERS = orderFiltersSchema.parse({})

export function OrderListTable() {
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS)
  const { data, isLoading, isError } = useOrders(filters)
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))

  const columns = defineColumns<OrderHeader>([
    {
      id: 'orderNumber',
      header: 'Orden #',
      cell: (row) => `#${row.orderNumber}`,
      size: 90,
    },
    {
      id: 'status',
      header: 'Estado',
      cell: (row) => <StatusBadge status={row.status} />,
      size: 110,
      enableSorting: false,
    },
    {
      id: 'createdAt',
      header: 'Fecha',
      cell: (row) => format(row.createdAt, 'dd/MM/yyyy HH:mm'),
      size: 150,
    },
    {
      id: 'subtotal',
      header: 'Subtotal',
      cell: (row) => formatCurrency(row.subtotal),
      meta: { align: 'right' },
      size: 120,
      enableSorting: false,
    },
    {
      id: 'discountAmount',
      header: 'Descuento',
      cell: (row) => row.discountAmount > 0 ? formatCurrency(-row.discountAmount) : '—',
      meta: { align: 'right' },
      size: 110,
      enableSorting: false,
    },
    {
      id: 'total',
      header: 'Total',
      cell: (row) => formatCurrency(row.total),
      meta: { align: 'right' },
      size: 130,
    },
    {
      id: 'notes',
      header: 'Notas',
      cell: (row) => row.notes ?? '—',
      size: 200,
      enableSorting: false,
    },
  ])

  const adminFilterDefs = defineFilters<OrderFilters>([
    {
      id: 'userId',
      type: 'asyncselect',
      label: 'Cajero',
      useOptions: useStaffOptions,
    },
    {
      id: 'branchId',
      type: 'text',
      label: 'Sucursal',
      placeholder: 'ID de sucursal',
    },
  ])

  const filterDefs = defineFilters<OrderFilters>([
    {
      id: 'status',
      type: 'select',
      label: 'Estado',
      options: [
        { label: 'Pendiente', value: ORDER_STATUS.PENDING },
        { label: 'Cobrado', value: ORDER_STATUS.PAID },
        { label: 'Cancelado', value: ORDER_STATUS.CANCELLED },
      ],
    },
    {
      id: 'createdAt',
      type: 'daterange',
      label: 'Fecha',
      fromKey: 'from',
      toKey: 'to',
    },
    ...(isAdmin ? adminFilterDefs : []),
  ])

  function handleFilterChange(update: Partial<OrderFilters>) {
    setFilters((prev) => ({ ...prev, ...update, page: 1 }))
  }

  return (
    <DataTable
      tableId="orders-list"
      columns={columns}
      data={data?.data ?? []}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="No hay órdenes."
      exportable
      exportFilename="ordenes"
      stickyHeader
      filterBar={
        <FilterBar
          defs={filterDefs}
          values={filters}
          onChange={handleFilterChange}
        />
      }
      onRowClick={(row) => eventBus.emit('order.detailSheet.requested', { orderId: row.id })}
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
