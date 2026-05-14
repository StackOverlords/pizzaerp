import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { UserRole } from '../schemas'

interface RoleBadgeProps {
  role: UserRole
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const { t } = useTranslation()

  switch (role) {
    case 'ADMIN':
      return (
        <Badge
          variant="outline"
          className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700"
        >
          {t('staff.roles.ADMIN')}
        </Badge>
      )
    case 'CAJERO':
      return (
        <Badge
          variant="outline"
          className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
        >
          {t('staff.roles.CAJERO')}
        </Badge>
      )
    case 'HORNERO':
      return (
        <Badge
          variant="outline"
          className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700"
        >
          {t('staff.roles.HORNERO')}
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">
          {role}
        </Badge>
      )
  }
}
