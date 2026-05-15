import { DataTable, defineColumns } from '@/components/data-table'
import { useSupplyClosings } from '../api'
import type { SupplyClosure, SupplyClosingFilters } from '../schemas'

interface SupplyClosingTableProps {
  filters?: SupplyClosingFilters
}

export function SupplyClosingTable({ filters }: SupplyClosingTableProps) {
  const { data: closings = [], isLoading, isError } = useSupplyClosings(filters)

  const columns = defineColumns<SupplyClosure>([
    {
      id: 'closureDate',
      header: 'Fecha',
      cell: (row) => {
        const [year, month, day] = row.closureDate.split('-')
        return `${day}/${month}/${year}`
      },
      size: 100,
    },
    {
      id: 'supplyType',
      header: 'Tipo',
      accessorKey: 'supplyType',
      size: 140,
    },
    {
      id: 'initialCount',
      header: 'Inicial',
      accessorKey: 'initialCount',
      size: 80,
    },
    {
      id: 'soldCount',
      header: 'Vendidos',
      accessorKey: 'soldCount',
      size: 90,
    },
    {
      id: 'wastageCount',
      header: 'Mermas',
      accessorKey: 'wastageCount',
      size: 80,
    },
    {
      id: 'theoreticalRemaining',
      header: 'Teórico',
      accessorKey: 'theoreticalRemaining',
      size: 80,
    },
    {
      id: 'actualRemaining',
      header: 'Actual',
      accessorKey: 'actualRemaining',
      size: 80,
    },
    {
      id: 'difference',
      header: 'Diferencia',
      cell: (row) => (
        <span className={row.difference !== 0 ? 'text-destructive font-medium' : undefined}>
          {row.difference}
        </span>
      ),
      size: 90,
      enableSorting: false,
    },
  ])

  return (
    <DataTable
      tableId="supply-closings"
      columns={columns}
      data={closings}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="No hay cierres registrados."
      stickyHeader
    />
  )
}
