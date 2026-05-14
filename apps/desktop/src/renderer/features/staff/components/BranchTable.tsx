import { useTranslation } from 'react-i18next'
import { DataTable, defineColumns } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/core/auth/store'
import { commandRegistry } from '@/core/commands/command-registry'
import { useBranches } from '../api'
import type { Branch } from '../schemas'

interface BranchTableProps {
  onEdit: (branch: Branch) => void
  onDelete: (branch: Branch) => void
}

export function BranchTable({ onEdit, onDelete }: BranchTableProps) {
  const { t } = useTranslation()
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))

  const { data: branches = [], isLoading, isError } = useBranches()

  const columns = defineColumns<Branch>([
    {
      id: 'name',
      header: t('staff.branches.table.name'),
      accessorKey: 'name',
      size: 260,
    },
  ])

  const rowActions = isAdmin
    ? (branch: Branch) => [
        {
          label: t('common.edit'),
          onClick: () => onEdit(branch),
        },
        {
          label: t('common.delete'),
          onClick: () => onDelete(branch),
          variant: 'destructive' as const,
        },
      ]
    : undefined

  function handleNewBranch() {
    commandRegistry.execute('staff.action.createBranch')
  }

  return (
    <DataTable
      tableId="staff-branches"
      columns={columns}
      data={branches}
      isLoading={isLoading}
      isError={isError}
      emptyMessage={t('staff.branches.empty')}
      stickyHeader
      rowActions={rowActions}
      toolbar={
        isAdmin ? (
          <Button size="sm" onClick={handleNewBranch}>
            {t('staff.branches.newCta')}
          </Button>
        ) : undefined
      }
    />
  )
}
