import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/auth/store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export function AccountSection() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const initials = (user?.username ?? '?')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-foreground">{t('settings.account.title')}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('settings.account.description')}
        </p>
      </div>

      <Separator />

      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user?.username ?? '—'}</p>
        </div>
      </div>

      {user?.role && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('settings.account.roles')}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{user.role}</Badge>
            </div>
          </div>
        </>
      )}

      <Separator />

      <Button variant="destructive" size="sm" onClick={logout}>
        {t('settings.account.logout')}
      </Button>
    </div>
  )
}

