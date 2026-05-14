import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { extractApiMessage } from '@/core/http/error'
import { notify } from '@/core/notify'
import { useCreateUser, useUpdateUser, useBranches } from '../api'
import {
  createUserFormSchema,
  updateUserFormSchema,
  USER_ROLE_VALUES,
  BRANCH_NONE_SENTINEL,
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
  const [apiError, setApiError] = useState<string | null>(null)

  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const { data: branches = [], isLoading: branchesLoading } = useBranches()

  const isPending = createMutation.isPending || updateMutation.isPending

  const createValues: CreateUserFormInput = {
    username: '',
    password: '',
    role:     'CAJERO',
    branchId: BRANCH_NONE_SENTINEL,
  }

  const editValues: UpdateUserFormInput = {
    role:     user?.role ?? 'CAJERO',
    branchId: branchPayloadToValue(user?.branchId),
  }

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateUserFormInput | UpdateUserFormInput>({
    resolver: zodResolver(mode === 'create' ? createUserFormSchema : updateUserFormSchema),
    // `values` (not `defaultValues`) keeps the form reactive when `user` changes between opens
    values: mode === 'edit' ? editValues : createValues,
  })

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      reset()
      setApiError(null)
    }
    onOpenChange(isOpen)
  }

  async function onSubmit(data: CreateUserFormInput | UpdateUserFormInput): Promise<void> {
    setApiError(null)
    try {
      if (mode === 'create') {
        const c = data as CreateUserFormInput
        await createMutation.mutateAsync({
          username: c.username,
          password: c.password,
          role:     c.role,
          branchId: branchValueToPayload(c.branchId),
        })
        notify(t('staff.users.toast.created'), { type: 'success' })
      } else {
        if (!user) return
        const u = data as UpdateUserFormInput
        await updateMutation.mutateAsync({
          id: user.id,
          input: {
            role:     u.role,
            branchId: branchValueToPayload(u.branchId),
          },
        })
        notify(t('staff.users.toast.updated'), { type: 'success' })
      }
      handleClose(false)
    } catch (err) {
      setApiError(extractApiMessage(err))
    }
  }

  const title       = mode === 'create' ? t('staff.users.form.createTitle') : t('staff.users.form.editTitle')
  const submitLabel = mode === 'create' ? t('staff.users.form.submitCreate') : t('staff.users.form.submitEdit')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Username — solo en create */}
          {mode === 'create' && (
            <div className="space-y-1.5">
              <label htmlFor="user-username" className="text-sm font-medium">
                {t('staff.users.form.username')} <span className="text-destructive">*</span>
              </label>
              <Input
                id="user-username"
                autoFocus
                placeholder="ej: pepe"
                {...register('username' as keyof CreateUserFormInput)}
              />
              {(errors as Record<string, { message?: string }>)['username']?.message && (
                <p className="text-sm text-destructive">
                  {(errors as Record<string, { message?: string }>)['username'].message}
                </p>
              )}
            </div>
          )}

          {/* Password — solo en create */}
          {mode === 'create' && (
            <div className="space-y-1.5">
              <label htmlFor="user-password" className="text-sm font-medium">
                {t('staff.users.form.password')} <span className="text-destructive">*</span>
              </label>
              <Input
                id="user-password"
                type="password"
                placeholder="••••••"
                {...register('password' as keyof CreateUserFormInput)}
              />
              {(errors as Record<string, { message?: string }>)['password']?.message && (
                <p className="text-sm text-destructive">
                  {(errors as Record<string, { message?: string }>)['password'].message}
                </p>
              )}
            </div>
          )}

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t('staff.users.form.role')} <span className="text-destructive">*</span>
            </label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('staff.users.form.role')} />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLE_VALUES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(`staff.roles.${role}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role?.message && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          {/* Branch */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t('staff.users.form.branch')}
            </label>
            <Controller
              control={control}
              name="branchId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={branchesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={branchesLoading ? t('common.loading') : t('staff.users.form.branchNone')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BRANCH_NONE_SENTINEL}>
                      {t('staff.users.form.branchNone')}
                    </SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {apiError && (
            <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {apiError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('staff.users.form.submitting') : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
