import { format } from 'date-fns'
import { DataTable, defineColumns } from '@/components/data-table'
import { useAuthStore } from '@/core/auth/store'
import { DishStatusBadge } from '@/features/menu/components/DishStatusBadge'
import { useSupplyTypes } from '../api'
import type { SupplyType } from '../schemas'

interface SupplyTypeTableProps {
  onEdit: (supplyType: SupplyType) => void
  onDeactivate: (supplyType: SupplyType) => void
}

export function SupplyTypeTable({ onEdit, onDeactivate }: SupplyTypeTableProps) {
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))
  const { data: supplyTypes = [], isLoading, isError } = useSupplyTypes()

  const columns = defineColumns<SupplyType>([
    {
      id: 'name',
      header: 'Nombre',
      accessorKey: 'name',
      size: 200,
    },
    {
      id: 'active',
      header: 'Estado',
      cell: (row) => <DishStatusBadge active={row.active} />,
      size: 110,
      enableSorting: false,
    },
    {
      id: 'createdAt',
      header: 'Creado',
      cell: (row) => format(row.createdAt, 'dd/MM/yyyy'),
      size: 110,
    },
  ])

  const rowActions = isAdmin
    ? (supplyType: SupplyType) => [
        {
          label: 'Editar',
          onClick: () => onEdit(supplyType),
        },
        {
          label: 'Desactivar',
          onClick: () => onDeactivate(supplyType),
          variant: 'destructive' as const,
          disabled: (st: SupplyType) => !st.active,
        },
      ]
    : undefined

  return (
    <DataTable
      tableId="supply-types"
      columns={columns}
      data={supplyTypes}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="No hay tipos de insumo registrados."
      stickyHeader
      rowActions={rowActions}
    />
  )
}
