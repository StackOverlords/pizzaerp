import { format } from 'date-fns'
import { DataTable, defineColumns } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/core/auth/store'
import { useBranches } from '@/features/staff/api'
import { useSupplyTransfers } from '../api'
import { TRANSFER_STATUS, type SupplyTransfer, type SupplyTransferFilters } from '../schemas'

interface SupplyTransferTableProps {
  filters?: SupplyTransferFilters
  onReceive: (transfer: SupplyTransfer) => void
}

export function SupplyTransferTable({ filters, onReceive }: SupplyTransferTableProps) {
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))
  const { data: transfers = [], isLoading, isError } = useSupplyTransfers(filters)
  const { data: branches = [] } = useBranches()

  function getBranchName(branchId: string): string {
    return branches.find((b) => b.id === branchId)?.name ?? branchId
  }

  const columns = defineColumns<SupplyTransfer>([
    {
      id: 'transferDate',
      header: 'Fecha',
      cell: (row) => {
        const [year, month, day] = row.transferDate.split('-')
        return `${day}/${month}/${year}`
      },
      size: 100,
    },
    {
      id: 'fromBranchId',
      header: 'Desde',
      cell: (row) => getBranchName(row.fromBranchId),
      size: 150,
      enableSorting: false,
    },
    {
      id: 'toBranchId',
      header: 'Hacia',
      cell: (row) => getBranchName(row.toBranchId),
      size: 150,
      enableSorting: false,
    },
    {
      id: 'status',
      header: 'Estado',
      cell: (row) => (
        row.status === TRANSFER_STATUS.IN_TRANSIT ? (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
            En tránsito
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            Recibida
          </Badge>
        )
      ),
      size: 120,
      enableSorting: false,
    },
    {
      id: 'items',
      header: 'Ítems',
      cell: (row) => row.items.length,
      size: 80,
      enableSorting: false,
    },
    {
      id: 'sentAt',
      header: 'Enviada',
      cell: (row) => format(row.sentAt, 'dd/MM/yyyy'),
      size: 110,
    },
  ])

  const rowActions = isAdmin
    ? (transfer: SupplyTransfer) => [
        {
          label: 'Recibir',
          onClick: () => onReceive(transfer),
          disabled: (t: SupplyTransfer) => t.status !== TRANSFER_STATUS.IN_TRANSIT,
        },
      ]
    : undefined

  return (
    <DataTable
      tableId="supply-transfers"
      columns={columns}
      data={transfers}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="No hay transferencias registradas."
      stickyHeader
      rowActions={rowActions}
    />
  )
}
