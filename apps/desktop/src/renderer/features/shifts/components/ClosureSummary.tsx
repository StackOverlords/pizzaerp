import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Closure } from '../schemas'

interface ClosureSummaryProps {
  closure: Closure
}

function DiffBadge({ value }: { value: number }) {
  const isZero = value === 0
  return (
    <Badge
      variant={isZero ? 'secondary' : 'destructive'}
      className={isZero ? 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400' : ''}
    >
      {value >= 0 ? `+${value}` : String(value)}
    </Badge>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
}

export function ClosureSummary({ closure }: ClosureSummaryProps) {
  const { t } = useTranslation()

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('shifts.summary.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cash row */}
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">{t('shifts.summary.cash')}</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t('shifts.summary.declared')}</p>
              <p className="font-medium">{formatCurrency(closure.declaredCash)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('shifts.summary.expected')}</p>
              <p className="font-medium">{formatCurrency(closure.expectedCash)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('shifts.summary.difference')}</p>
              <DiffBadge value={closure.cashDifference} />
            </div>
          </div>
        </div>

        <Separator />

        {/* QR count row */}
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">{t('shifts.summary.qrCount')}</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t('shifts.summary.declared')}</p>
              <p className="font-medium">{closure.declaredQrCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('shifts.summary.expected')}</p>
              <p className="font-medium">{closure.expectedQrCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('shifts.summary.difference')}</p>
              <DiffBadge value={closure.qrCountDifference} />
            </div>
          </div>
        </div>

        {closure.notes && (
          <>
            <Separator />
            <div>
              <p className="mb-1 text-xs text-muted-foreground">{t('shifts.summary.notes')}</p>
              <p className="text-sm">{closure.notes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
