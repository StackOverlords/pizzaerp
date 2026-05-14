import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { eventBus } from '@/core/events/event-bus'
import { useAuthStore } from '@/core/auth/store'
import { BranchTable } from '@/features/staff/components/BranchTable'
import { BranchFormDialog } from '@/features/staff/components/BranchFormDialog'
import { DeleteBranchDialog } from '@/features/staff/components/DeleteBranchDialog'
import type { Branch } from '@/features/staff/schemas'

export default function StaffBranchesPage() {
  const { t } = useTranslation()
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTargetBranch, setDeleteTargetBranch] = useState<Branch | null>(null)

  useEffect(() => {
    const unsub = eventBus.on('staff.branchDialog.requested', ({ mode }) => {
      setFormMode(mode)
      setSelectedBranch(null)
      setFormOpen(true)
    })
    return unsub
  }, [])

  function handleEdit(branch: Branch) {
    setSelectedBranch(branch)
    setFormMode('edit')
    setFormOpen(true)
  }

  function handleDelete(branch: Branch) {
    setDeleteTargetBranch(branch)
    setDeleteOpen(true)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('staff.branches.title')}</h1>
      </div>

      {isAdmin && (
        <BranchTable
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <BranchFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        branch={selectedBranch}
      />

      <DeleteBranchDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        branch={deleteTargetBranch}
      />
    </div>
  )
}
