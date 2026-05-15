import { useState } from 'react'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { DataTable, FilterBar, defineColumns, defineFilters } from '@/components/data-table'
import { useBranches } from '@/features/staff/api'
import { useEffectiveBranchId } from '@/features/branch-context/hooks'
import { useAuthStore } from '@/core/auth/store'
import { useSupplyTransferReport } from '@/features/reports/api'
import {
  REPORT_STATUS,
  type ReportStatus,
  type SupplyTransferReportItem,
} from '@/features/reports/schemas'

// ── Types ──────────────────────────────────────────────────────────────────────

const reportFiltersSchema = z.object({
  from: z.string().optional(),
  to:   z.string().optional(),
})
type ReportFilters = z.infer<typeof reportFiltersSchema>

interface FlatReportRow extends SupplyTransferReportItem {
  branchName: string
  date:       string
  reportStatus: ReportStatus
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function OverallStatusBadge({ status }: { status: ReportStatus }) {
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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user)
  const effectiveBranchId = useEffectiveBranchId()
  const { data: branches = [] } = useBranches()

  const [filters, setFilters] = useState<ReportFilters>({ from: undefined, to: undefined })

  const { data: reports = [], isLoading, isError } = useSupplyTransferReport(filters)

  // Flatten reports into rows for the DataTable
  const rows: FlatReportRow[] = reports.flatMap((report) => {
    const branch = branches.find((b) => b.id === report.branchId)
    const branchName = branch?.name ?? report.branchId
    const [year, month, day] = report.date.split('-')
    const formattedDate = `${day}/${month}/${year}`
    return report.supplyTypes.map((item) => ({
      ...item,
      branchName,
      date: formattedDate,
      reportStatus: report.overallStatus,
    }))
  })

  const isAdminWithoutBranch = user?.role === 'ADMIN' && !user.branchId

  const columns = defineColumns<FlatReportRow>([
    {
      id: 'date',
      header: 'Fecha',
      accessorKey: 'date',
      size: 100,
    },
    ...(isAdminWithoutBranch
      ? [
          {
            id: 'branchName',
            header: 'Sucursal',
            accessorKey: 'branchName' as keyof FlatReportRow,
            size: 140,
          } as const,
        ]
      : []),
    {
      id: 'supplyType',
      header: 'Tipo de insumo',
      accessorKey: 'supplyType',
      size: 150,
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
      header: 'Estado',
      cell: (row) => <OverallStatusBadge status={row.status} />,
      size: 100,
      enableSorting: false,
    },
  ])

  const filterDefs = defineFilters<ReportFilters>([
    {
      id: 'periodo',
      type: 'daterange',
      label: 'Período',
      fromKey: 'from',
      toKey: 'to',
    },
  ])

  // Determine empty state message
  let emptyMessage = 'No hay datos para el período seleccionado.'
  if (!effectiveBranchId && !filters.from && !filters.to) {
    emptyMessage = 'Selecciona una sucursal y un período para ver el reporte.'
  } else if (!filters.from && !filters.to) {
    emptyMessage = 'Selecciona un período para ver el reporte.'
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">Reportes de insumos</h1>

      <DataTable
        tableId="supply-transfer-report"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        isError={isError}
        emptyMessage={emptyMessage}
        exportable
        exportFilename="reporte-insumos"
        stickyHeader
        filterBar={
          <FilterBar
            defs={filterDefs}
            values={filters}
            onChange={(update) => setFilters((prev) => ({ ...prev, ...update }))}
          />
        }
      />
    </div>
  )
}
