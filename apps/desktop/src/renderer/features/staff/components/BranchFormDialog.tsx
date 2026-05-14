import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { extractApiMessage } from '@/core/http/error'
import { notify } from '@/core/notify'
import { useCreateBranch, useUpdateBranch } from '../api'
import { branchFormSchema, type Branch, type BranchFormInput } from '../schemas'

interface BranchFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  branch?: Branch | null
}

export function BranchFormDialog({ open, onOpenChange, mode, branch }: BranchFormDialogProps) {
  const { t } = useTranslation()
  const [apiError, setApiError] = useState<string | null>(null)

  const createMutation = useCreateBranch()
  const updateMutation = useUpdateBranch()

  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchFormInput>({
    resolver: zodResolver(branchFormSchema),
    // `values` (not `defaultValues`) keeps the form reactive when `branch` changes between opens
    values: mode === 'edit' && branch
      ? { name: branch.name }
      : { name: '' },
  })

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      reset()
      setApiError(null)
    }
    onOpenChange(isOpen)
  }

  async function onSubmit(data: BranchFormInput): Promise<void> {
    setApiError(null)
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(data)
        notify(t('staff.branches.toast.created'), { type: 'success' })
      } else {
        if (!branch) return
        await updateMutation.mutateAsync({ id: branch.id, input: data })
        notify(t('staff.branches.toast.updated'), { type: 'success' })
      }
      handleClose(false)
    } catch (err) {
      setApiError(extractApiMessage(err))
    }
  }

  const title       = mode === 'create' ? t('staff.branches.form.createTitle') : t('staff.branches.form.editTitle')
  const submitLabel = mode === 'create' ? t('staff.branches.form.submitCreate') : t('staff.branches.form.submitEdit')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <label htmlFor="branch-name" className="text-sm font-medium">
              {t('staff.branches.form.name')} <span className="text-destructive">*</span>
            </label>
            <Input
              id="branch-name"
              autoFocus
              placeholder="ej: Centro"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
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
              {isPending ? t('staff.branches.form.submitting') : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
