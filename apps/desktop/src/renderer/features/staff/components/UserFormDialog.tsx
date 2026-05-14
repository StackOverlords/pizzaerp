import { useTranslation } from 'react-i18next'
import { FormDialog, defineFields, FORM_NONE } from '@/components/schema-form'
import { notify } from '@/core/notify'
import { useCreateUser, useUpdateUser, useBranches } from '../api'
import {
  createUserFormSchema,
  updateUserFormSchema,
  USER_ROLE_VALUES,
  branchValueToPayload,
  branchPayloadToValue,
  type User,
  type CreateUserFormInput,
  type UpdateUserFormInput,
} from '../schemas'

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  user?: User | null
}

export function UserFormDialog({ open, onOpenChange, mode, user }: UserFormDialogProps) {
  const { t } = useTranslation()
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const { data: branches = [], isLoading: branchesLoading } = useBranches()

  const isPending = createMutation.isPending || updateMutation.isPending

  const roleOptions = USER_ROLE_VALUES.map((role) => ({
    label: t(`staff.roles.${role}`),
    value: role,
  }))

  const branchOptions = branches.map((b) => ({ label: b.name, value: b.id }))

  const title       = mode === 'create' ? t('staff.users.form.createTitle')  : t('staff.users.form.editTitle')
  const submitLabel = mode === 'create' ? t('staff.users.form.submitCreate') : t('staff.users.form.submitEdit')
  const cancelLabel = t('common.cancel')
  const branchNullLabel = t('staff.users.form.branchNone')

  if (mode === 'create') {
    const fields = defineFields<CreateUserFormInput>([
      {
        id: 'username', type: 'text', label: t('staff.users.form.username'),
        required: true, placeholder: 'ej: pepe', autoFocus: true,
      },
      {
        id: 'password', type: 'password', label: t('staff.users.form.password'),
        required: true, placeholder: '••••••',
      },
      {
        id: 'role', type: 'select', label: t('staff.users.form.role'),
        required: true, options: roleOptions,
      },
      {
        id: 'branchId', type: 'select', label: t('staff.users.form.branch'),
        options: branchOptions, loading: branchesLoading,
        nullable: true, nullLabel: branchNullLabel,
      },
    ])

    const handleCreate = async (data: CreateUserFormInput) => {
      await createMutation.mutateAsync({
        username: data.username,
        password: data.password,
        role:     data.role,
        branchId: branchValueToPayload(data.branchId),
      })
      notify(t('staff.users.toast.created'), { type: 'success' })
      onOpenChange(false)
    }

    return (
      <FormDialog<CreateUserFormInput>
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        fields={fields}
        schema={createUserFormSchema}
        defaultValues={{ username: '', password: '', role: 'CAJERO', branchId: FORM_NONE }}
        onSubmit={handleCreate}
        isPending={isPending}
        submitLabel={submitLabel}
        cancelLabel={cancelLabel}
        maxWidth="md"
      />
    )
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────────

  const fields = defineFields<UpdateUserFormInput>([
    {
      id: 'role', type: 'select', label: t('staff.users.form.role'),
      required: true, options: roleOptions, autoFocus: true,
    },
    {
      id: 'branchId', type: 'select', label: t('staff.users.form.branch'),
      options: branchOptions, loading: branchesLoading,
      nullable: true, nullLabel: branchNullLabel,
    },
  ])

  async function handleUpdate(data: UpdateUserFormInput) {
    if (!user) return
    await updateMutation.mutateAsync({
      id: user.id,
      input: {
        role:     data.role,
        branchId: branchValueToPayload(data.branchId),
      },
    })
    notify(t('staff.users.toast.updated'), { type: 'success' })
    onOpenChange(false)
  }

  return (
    <FormDialog<UpdateUserFormInput>
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      fields={fields}
      schema={updateUserFormSchema}
      values={user ? { role: user.role, branchId: branchPayloadToValue(user.branchId) } : undefined}
      onSubmit={handleUpdate}
      isPending={isPending}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      maxWidth="md"
    />
  )
}
