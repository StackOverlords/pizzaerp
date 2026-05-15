import { Badge } from '@/components/ui/badge'
import { DataTable, defineColumns } from '@/components/data-table'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CASH_MOVEMENT_TYPE, type CashMovement } from '../schemas'

interface Props {
  movements: CashMovement[]
  isLoading: boolean
}

const columns = defineColumns<CashMovement>([
  {
    id: 'type',
    accessorKey: 'type',
    header: 'Tipo',
    size: 110,
    enableSorting: false,
    cell: (m) => (
      <Badge variant={m.type === CASH_MOVEMENT_TYPE.INGRESO ? 'default' : 'destructive'}>
        {m.type === CASH_MOVEMENT_TYPE.INGRESO ? 'Ingreso' : 'Retiro'}
      </Badge>
    ),
  },
  {
    id: 'reason',
    accessorKey: 'reason',
    header: 'Motivo',
    size: 300,
    cell: (m) => <span className="text-sm">{m.reason}</span>,
  },
  {
    id: 'amount',
    accessorKey: 'amount',
    header: 'Monto',
    size: 130,
    meta: { align: 'right' },
    cell: (m) => (
      <span className={cn('font-medium tabular-nums', m.type === CASH_MOVEMENT_TYPE.INGRESO ? 'text-green-600' : 'text-destructive')}>
        {m.type === CASH_MOVEMENT_TYPE.INGRESO ? '+' : '−'}{formatCurrency(m.amount)}
      </span>
    ),
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Hora',
    size: 90,
    enableSorting: false,
    cell: (m) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {m.createdAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    ),
  },
])

export function CashMovementList({ movements, isLoading }: Props) {
  return (
    <DataTable
      tableId="shift-movements"
      columns={columns}
      data={movements}
      isLoading={isLoading}
      emptyMessage="Aún no hay movimientos registrados."
      defaultDensity="compact"
    />
  )
}
