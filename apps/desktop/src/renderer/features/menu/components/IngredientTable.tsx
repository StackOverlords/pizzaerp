import { useState } from 'react'
import { format } from 'date-fns'
import { DataTable, FilterBar, defineColumns, defineFilters } from '@/components/data-table'
import { useAuthStore } from '@/core/auth/store'
import { useIngredients } from '../api'
import { DishStatusBadge } from './DishStatusBadge'
import type { Ingredient, IngredientFilters } from '../schemas'

interface IngredientTableProps {
  onEdit: (ingredient: Ingredient) => void
  onDeactivate: (ingredient: Ingredient) => void
}

export function IngredientTable({ onEdit, onDeactivate }: IngredientTableProps) {
  const [filters, setFilters] = useState<IngredientFilters>({})
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))
  const { data: ingredients = [], isLoading, isError } = useIngredients(filters)

  const columns = defineColumns<Ingredient>([
    {
      id: 'name',
      header: 'Nombre',
      accessorKey: 'name',
      size: 200,
    },
    {
      id: 'purchaseUnit',
      header: 'Unidad compra',
      accessorKey: 'purchaseUnit',
      size: 130,
    },
    {
      id: 'consumptionUnit',
      header: 'Unidad consumo',
      accessorKey: 'consumptionUnit',
      size: 140,
    },
    {
      id: 'conversionFactor',
      header: 'Factor',
      accessorKey: 'conversionFactor',
      size: 90,
    },
    {
      id: 'wastagePercentage',
      header: 'Merma (%)',
      accessorKey: 'wastagePercentage',
      size: 100,
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

  const filterDefs = defineFilters<IngredientFilters>([
    {
      id: 'activeOnly',
      type: 'boolean',
      label: 'Sólo activos',
    },
  ])

  function handleFilterChange(update: Partial<IngredientFilters>) {
    setFilters((prev) => ({ ...prev, ...update }))
  }

  const rowActions = isAdmin
    ? (ingredient: Ingredient) => [
        {
          label: 'Editar',
          onClick: () => onEdit(ingredient),
        },
        {
          label: 'Desactivar',
          onClick: () => onDeactivate(ingredient),
          variant: 'destructive' as const,
          disabled: (i: Ingredient) => !i.active,
        },
      ]
    : undefined

  return (
    <DataTable
      tableId="menu-ingredients"
      columns={columns}
      data={ingredients}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="No hay ingredientes registrados."
      stickyHeader
      rowActions={rowActions}
      filterBar={
        <FilterBar
          defs={filterDefs}
          values={filters}
          onChange={handleFilterChange}
        />
      }
    />
  )
}
