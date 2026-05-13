import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { commandRegistry } from '@/core/commands/command-registry'
import { useCurrentShift } from '@/features/shifts/api'
import { SHIFT_STATUS } from '@/features/shifts/schemas'
import { formatCurrency, formatDatetime } from '@/lib/format'

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

export default function ShiftsCurrentPage() {
  const { t } = useTranslation()
  const { data: shift, isLoading } = useCurrentShift()

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
    <div className="p-6 max-w-lg">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Clock size={18} />
            {t('shifts.indicator.open', { time: shift.openedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t('shifts.current.opened')}</p>
              <p className="font-medium">{formatDatetime(shift.openedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('shifts.current.initialCash')}</p>
              <p className="font-medium">{formatCurrency(shift.initialCash)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('shifts.current.elapsed')}</p>
              <p className="font-medium">
                <ElapsedTime since={shift.openedAt} />
              </p>
            </div>
          </div>

          <Separator />

          <Button
            variant="destructive"
            className="w-full"
            onClick={() => commandRegistry.execute('shifts.action.closeShift')}
          >
            {t('shifts.current.closeCta')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
