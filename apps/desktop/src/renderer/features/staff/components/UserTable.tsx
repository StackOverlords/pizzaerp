import { useMemo } from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { DataTable, defineColumns } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/core/auth/store'
import { commandRegistry } from '@/core/commands/command-registry'
import { useUsers, useBranches } from '../api'
import { RoleBadge } from './RoleBadge'
import type { User } from '../schemas'

interface UserTableProps {
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}

export function UserTable({ onEdit, onDelete }: UserTableProps) {
  const { t } = useTranslation()
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))
  const currentUserId = useAuthStore((s) => s.user?.id)

  const { data: users = [], isLoading, isError } = useUsers()
  const { data: branches = [] } = useBranches()

  const branchMap = useMemo(
    () => new Map<string, string>(branches.map((b) => [b.id, b.name])),
    [branches],
  )

  const columns = defineColumns<User>([
    {
      id: 'username',
      header: t('staff.users.table.username'),
      accessorKey: 'username',
      size: 180,
    },
    {
      id: 'role',
      header: t('staff.users.table.role'),
      cell: (row) => <RoleBadge role={row.role} />,
      size: 120,
      enableSorting: false,
    },
    {
      id: 'branchId',
      header: t('staff.users.table.branch'),
      cell: (row) => (row.branchId ? (branchMap.get(row.branchId) ?? '—') : '—'),
      size: 180,
      enableSorting: false,
    },
    {
      id: 'createdAt',
      header: t('staff.users.table.createdAt'),
      cell: (row) => format(row.createdAt, 'dd/MM/yyyy'),
      size: 110,
    },
  ])

  const rowActions = isAdmin
    ? (user: User) => {
        if (user.id === currentUserId) return []
        return [
          {
            label: t('common.edit'),
            onClick: () => onEdit(user),
          },
          {
            label: t('common.delete'),
            onClick: () => onDelete(user),
            variant: 'destructive' as const,
          },
        ]
      }
    : undefined

  function handleNewUser() {
    commandRegistry.execute('staff.action.createUser')
  }

  return (
    <DataTable
      tableId="staff-users"
      columns={columns}
      data={users}
      isLoading={isLoading}
      isError={isError}
      emptyMessage={t('staff.users.empty')}
      searchable
      searchPlaceholder={`${t('staff.users.table.username')}...`}
      stickyHeader
      rowActions={rowActions}
      toolbar={
        isAdmin ? (
          <Button size="sm" onClick={handleNewUser}>
            {t('staff.users.newCta')}
          </Button>
        ) : undefined
      }
    />
  )
}
