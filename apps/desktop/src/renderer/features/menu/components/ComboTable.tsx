import { useState } from 'react'
import { DataTable, FilterBar, defineColumns, defineFilters } from '@/components/data-table'
import { useAuthStore } from '@/core/auth/store'
import { useCombos } from '../api'
import { DishStatusBadge } from './DishStatusBadge'
import type { Combo } from '../schemas'
import { timeForInput } from '../schemas'

interface ComboTableProps {
  onEdit:       (combo: Combo) => void
  onManageSlots:(combo: Combo) => void
  onDeactivate: (combo: Combo) => void
}

type ComboFilters = { activeOnly?: boolean }

export function ComboTable({ onEdit, onManageSlots, onDeactivate }: ComboTableProps) {
  const [filters, setFilters] = useState<ComboFilters>({})
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))
  const { data: combos = [], isLoading, isError } = useCombos(filters)

  const columns = defineColumns<Combo>([
    {
      id: 'name',
      header: 'Nombre',
      accessorKey: 'name',
      size: 200,
    },
    {
      id: 'salePrice',
      header: 'Precio',
      cell: (row) => `$${row.salePrice.toFixed(2)}`,
      size: 100,
    },
    {
      id: 'availability',
      header: 'Horario',
      cell: (row) => {
        const from = timeForInput(row.availableFrom)
        const to   = timeForInput(row.availableTo)
        if (!from && !to) return <span className="text-muted-foreground text-xs">Todo el día</span>
        return <span className="text-xs">{from} – {to}</span>
      },
      size: 130,
      enableSorting: false,
    },
    {
      id: 'active',
      header: 'Estado',
      cell: (row) => <DishStatusBadge active={row.active} />,
      size: 110,
      enableSorting: false,
    },
  ])

  const filterDefs = defineFilters<ComboFilters>([
    { id: 'activeOnly', type: 'boolean', label: 'Sólo activos' },
  ])

  const rowActions = isAdmin
    ? (combo: Combo) => [
        { label: 'Editar',         onClick: () => onEdit(combo) },
        { label: 'Gestionar slots', onClick: () => onManageSlots(combo) },
        {
          label: 'Desactivar',
          onClick: () => onDeactivate(combo),
          variant: 'destructive' as const,
          disabled: (c: Combo) => !c.active,
        },
      ]
    : undefined

  return (
    <DataTable
      tableId="menu-combos"
      columns={columns}
      data={combos}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="No hay combos registrados."
      stickyHeader
      rowActions={rowActions}
      filterBar={
        <FilterBar
          defs={filterDefs}
          values={filters}
          onChange={(u) => setFilters((prev) => ({ ...prev, ...u }))}
        />
      }
    />
  )
}
