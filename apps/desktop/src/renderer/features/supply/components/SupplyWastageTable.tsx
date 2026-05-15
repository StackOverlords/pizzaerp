import { format } from 'date-fns'
import { DataTable, defineColumns } from '@/components/data-table'
import { useSupplyWastages } from '../api'
import { WASTAGE_REASON_LABELS, type SupplyWastage, type SupplyWastageFilters } from '../schemas'

interface SupplyWastageTableProps {
  filters?: SupplyWastageFilters
}

export function SupplyWastageTable({ filters }: SupplyWastageTableProps) {
  const { data: wastages = [], isLoading, isError } = useSupplyWastages(filters)

  const columns = defineColumns<SupplyWastage>([
    {
      id: 'recordedAt',
      header: 'Fecha',
      cell: (row) => format(row.recordedAt, 'dd/MM/yyyy HH:mm'),
      size: 140,
    },
    {
      id: 'supplyType',
      header: 'Tipo',
      accessorKey: 'supplyType',
      size: 150,
    },
    {
      id: 'quantity',
      header: 'Cantidad',
      accessorKey: 'quantity',
      size: 90,
    },
    {
      id: 'reason',
      header: 'Motivo',
      cell: (row) => WASTAGE_REASON_LABELS[row.reason] ?? row.reason,
      size: 130,
      enableSorting: false,
    },
    {
      id: 'notes',
      header: 'Notas',
      cell: (row) => row.notes ?? '—',
      size: 200,
      enableSorting: false,
    },
  ])

  return (
    <DataTable
      tableId="supply-wastages"
      columns={columns}
      data={wastages}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="No hay mermas registradas."
      stickyHeader
    />
  )
}
