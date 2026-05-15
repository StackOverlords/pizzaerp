import { useState } from 'react'
import { DataTable, FilterBar, defineColumns, defineFilters } from '@/components/data-table'
import { formatCurrency } from '@/lib/format'
import { useAuthStore } from '@/core/auth/store'
import { useMenuDishes, useMenuCategories } from '../api'
import { DishStatusBadge } from './DishStatusBadge'
import { timeForInput } from '../schemas'
import type { Dish, DishFilters, Category } from '../schemas'

interface DishTableProps {
  onEdit:             (dish: Dish) => void
  onClone:            (dish: Dish) => void
  onDeactivate:       (dish: Dish) => void
  onManageIngredients:(dish: Dish) => void
}

function resolveCategoryName(categoryId: string | null, map: Map<string, string>): string {
  if (!categoryId) return '—'
  return map.get(categoryId) ?? '—'
}

function formatAvailability(from: string | null, to: string | null): string {
  if (!from && !to) return 'Siempre'
  const f = from ? timeForInput(from) : '?'
  const t = to ? timeForInput(to) : '?'
  return `${f} — ${t}`
}

export function DishTable({ onEdit, onClone, onDeactivate, onManageIngredients }: DishTableProps) {
  const [filters, setFilters] = useState<DishFilters>({})
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))
  const { data: dishes = [], isLoading, isError } = useMenuDishes(filters)
  const { data: categories = [] } = useMenuCategories({ activeOnly: false })

  const categoryMap = new Map<string, string>(
    categories.map((c: Category) => [c.id, c.name])
  )

  const categoryOptions = categories.map((c: Category) => ({
    label: c.name,
    value: c.id,
  }))

  const baseColumns = defineColumns<Dish>([
    {
      id: 'name',
      header: 'Nombre',
      accessorKey: 'name',
      size: 200,
    },
    {
      id: 'categoryId',
      header: 'Categoría',
      cell: (row) => resolveCategoryName(row.categoryId, categoryMap),
      size: 150,
      enableSorting: false,
    },
    {
      id: 'salePrice',
      header: 'Precio',
      cell: (row) => formatCurrency(row.salePrice),
      meta: { align: 'right' },
      size: 110,
    },
    {
      id: 'availability',
      header: 'Disponibilidad',
      cell: (row) => formatAvailability(row.availableFrom, row.availableTo),
      size: 150,
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

  const filterDefs = defineFilters<DishFilters>([
    {
      id: 'activeOnly',
      type: 'boolean',
      label: 'Sólo activos',
    },
    {
      id: 'categoryId',
      type: 'select',
      label: 'Categoría',
      options: categoryOptions,
      placeholder: 'Buscar categoría...',
    },
  ])

  function handleFilterChange(update: Partial<DishFilters>) {
    setFilters((prev) => ({ ...prev, ...update }))
  }

  const rowActions = isAdmin
    ? (dish: Dish) => [
        {
          label: 'Editar',
          onClick: () => onEdit(dish),
        },
        {
          label: 'Ingredientes',
          onClick: () => onManageIngredients(dish),
        },
        {
          label: 'Clonar',
          onClick: () => onClone(dish),
        },
        {
          label: 'Desactivar',
          onClick: () => onDeactivate(dish),
          variant: 'destructive' as const,
          disabled: (d: Dish) => !d.active,
        },
      ]
    : undefined

  return (
    <DataTable
      tableId="menu-dishes"
      columns={baseColumns}
      data={dishes}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="No hay platos registrados."
      searchable
      searchPlaceholder="Buscar por nombre..."
      stickyHeader
      exportable
      exportFilename="platos"
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
