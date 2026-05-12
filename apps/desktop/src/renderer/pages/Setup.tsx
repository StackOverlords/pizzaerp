import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SetupWizard } from '@/features/setup/components/SetupWizard'

export default function SetupPage() {
  const { t } = useTranslation()
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('setup.title')}</CardTitle>
          <CardDescription>{t('setup.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <SetupWizard />
        </CardContent>
      </Card>
    </div>
  )
}
