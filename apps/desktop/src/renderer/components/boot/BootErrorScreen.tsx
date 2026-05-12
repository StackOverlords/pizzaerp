import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface BootErrorScreenProps {
  variant: 'connection' | 'misconfigured'
  onRetry?: () => void
}

export function BootErrorScreen({ variant, onRetry }: BootErrorScreenProps) {
  const { t } = useTranslation()
  const isConnection = variant === 'connection'

  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
        <p className="text-2xl font-semibold text-foreground">
          {isConnection ? t('boot.connection.title') : t('boot.misconfigured.title')}
        </p>
        <p className="text-sm text-muted-foreground">
          {isConnection ? t('boot.connection.description') : t('boot.misconfigured.description')}
        </p>
        {isConnection && onRetry && (
          <Button onClick={onRetry} variant="outline">
            {t('boot.connection.retry')}
          </Button>
        )}
      </div>
    </div>
  )
}
