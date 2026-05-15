import { DataTable, defineColumns } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { REPORT_STATUS, type ReportStatus, type SupplyTransferReportItem } from '../schemas'

interface SupplyTransferReportTableProps {
  items: SupplyTransferReportItem[]
  isLoading: boolean
  isError: boolean
}

function StatusBadge({ status }: { status: ReportStatus }) {
  if (status === REPORT_STATUS.GREEN) {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
        OK
      </Badge>
    )
  }
  if (status === REPORT_STATUS.YELLOW) {
    return (
      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
        Atención
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
      Crítico
    </Badge>
  )
}

export function SupplyTransferReportTable({ items, isLoading, isError }: SupplyTransferReportTableProps) {
  const columns = defineColumns<SupplyTransferReportItem>([
    {
      id: 'supplyType',
      header: 'Tipo de insumo',
      accessorKey: 'supplyType',
      size: 160,
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
    {
      id: 'status',
      header: 'Semáforo',
      cell: (row) => <StatusBadge status={row.status} />,
      size: 100,
      enableSorting: false,
    },
  ])

  return (
    <DataTable
      tableId="supply-transfer-report"
      columns={columns}
      data={items}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="No hay datos para el período seleccionado."
      stickyHeader
    />
  )
}
