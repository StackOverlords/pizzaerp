import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Pizza } from 'lucide-react'
import { LoginForm } from '@/features/auth/components/LoginForm'

export default function LoginPage() {
  const { t } = useTranslation()
  return (
    <div
      className="flex h-full items-center justify-center bg-background"
      style={{
        backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--border) 60%, transparent) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center pb-2">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Pizza size={24} />
          </div>
          <CardTitle className="text-xl">FoodErp</CardTitle>
          <CardDescription>{t('auth.login.tagline')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
