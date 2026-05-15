import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { commandRegistry } from '@/core/commands/command-registry'
import { eventBus } from '@/core/events/event-bus'
import { useCurrentShift, useCashMovements } from '@/features/shifts/api'
import { SHIFT_STATUS, CASH_MOVEMENT_TYPE, type CashMovementType } from '@/features/shifts/schemas'
import { CashMovementDialog } from '@/features/shifts/components/CashMovementDialog'
import { CashMovementList } from '@/features/shifts/components/CashMovementList'
import { formatCurrency } from '@/lib/format'

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':')
}

function ElapsedTime({ since }: { since: Date }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - since.getTime())

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - since.getTime())
    }, 1000)
    return () => clearInterval(id)
  }, [since])

  return <span>{formatElapsed(elapsed)}</span>
}

interface StatChipProps {
  label: string
  value: string
  color?: 'green' | 'red'
}

function StatChip({ label, value, color }: StatChipProps) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-sm font-semibold tabular-nums', {
        'text-green-600': color === 'green',
        'text-destructive': color === 'red',
      })}>
        {value}
      </p>
    </div>
  )
}

export default function ShiftsCurrentPage() {
  const { t } = useTranslation()
  const { data: shift, isLoading } = useCurrentShift()
  const [movementDialog, setMovementDialog] = useState<CashMovementType | null>(null)

  const { data: movements = [], isLoading: movementsLoading } = useCashMovements(
    shift?.status === SHIFT_STATUS.OPEN ? shift.id : undefined,
  )

  const { ingresoTotal, retiroTotal, movementsNet } = useMemo(() => {
    const ing = movements
      .filter((m) => m.type === CASH_MOVEMENT_TYPE.INGRESO)
      .reduce((s, m) => s + m.amount, 0)
    const ret = movements
      .filter((m) => m.type === CASH_MOVEMENT_TYPE.RETIRO)
      .reduce((s, m) => s + m.amount, 0)
    return { ingresoTotal: ing, retiroTotal: ret, movementsNet: ing - ret }
  }, [movements])

  useEffect(() => {
    const unsub = eventBus.on('shifts.movementDialog.requested', ({ type }) => {
      setMovementDialog(type)
    })
    return unsub
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        {t('shifts.indicator.loading')}
      </div>
    )
  }

  if (!shift || shift.status !== SHIFT_STATUS.OPEN) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <Clock size={48} className="text-muted-foreground/40" />
        <div className="text-center">
          <h2 className="text-lg font-semibold">{t('shifts.current.empty.title')}</h2>
        </div>
        <Button onClick={() => commandRegistry.execute('shifts.action.openShift')}>
          {t('shifts.current.empty.cta')}
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">

      {/* Header strip */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-green-600">
            <Clock size={15} />
            <span className="text-sm font-medium">Turno activo</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">
            Desde las {shift.openedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="font-mono text-sm text-muted-foreground">
            · <ElapsedTime since={shift.openedAt} />
          </span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => commandRegistry.execute('shifts.action.closeShift')}
        >
          {t('shifts.current.closeCta')}
        </Button>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatChip label="Caja inicial" value={formatCurrency(shift.initialCash)} />
        <StatChip
          label="Ingresos"
          value={formatCurrency(ingresoTotal)}
          color={ingresoTotal > 0 ? 'green' : undefined}
        />
        <StatChip
          label="Retiros"
          value={formatCurrency(retiroTotal)}
          color={retiroTotal > 0 ? 'red' : undefined}
        />
        <StatChip
          label="Neto movimientos"
          value={`${movementsNet >= 0 ? '+' : ''}${formatCurrency(movementsNet)}`}
          color={movementsNet > 0 ? 'green' : movementsNet < 0 ? 'red' : undefined}
        />
      </div>

      {/* Movements section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Movimientos de caja</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMovementDialog(CASH_MOVEMENT_TYPE.INGRESO)}
            >
              <Plus size={13} className="mr-1" />
              Ingreso
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMovementDialog(CASH_MOVEMENT_TYPE.RETIRO)}
            >
              <Minus size={13} className="mr-1" />
              Retiro
            </Button>
          </div>
        </div>
        <CashMovementList movements={movements} isLoading={movementsLoading} />
      </div>

      {movementDialog !== null && (
        <CashMovementDialog
          open={movementDialog !== null}
          onOpenChange={(o) => { if (!o) setMovementDialog(null) }}
          type={movementDialog}
        />
      )}
    </div>
  )
}
