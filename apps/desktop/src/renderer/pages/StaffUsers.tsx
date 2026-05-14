import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { eventBus } from '@/core/events/event-bus'
import { useAuthStore } from '@/core/auth/store'
import { UserTable } from '@/features/staff/components/UserTable'
import { UserFormDialog } from '@/features/staff/components/UserFormDialog'
import { DeleteUserDialog } from '@/features/staff/components/DeleteUserDialog'
import type { User } from '@/features/staff/schemas'

export default function StaffUsersPage() {
  const { t } = useTranslation()
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null)

  useEffect(() => {
    const unsub = eventBus.on('staff.userDialog.requested', ({ mode }) => {
      setFormMode(mode)
      setSelectedUser(null)
      setFormOpen(true)
    })
    return unsub
  }, [])

  function handleEdit(user: User) {
    setSelectedUser(user)
    setFormMode('edit')
    setFormOpen(true)
  }

  function handleDelete(user: User) {
    setDeleteTargetUser(user)
    setDeleteOpen(true)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('staff.users.title')}</h1>
      </div>

      {isAdmin && (
        <UserTable
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        user={selectedUser}
      />

      <DeleteUserDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        user={deleteTargetUser}
      />
    </div>
  )
}
