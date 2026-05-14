import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { notify } from '@/core/notify'
import { extractApiMessage } from '@/core/http/error'
import { useDeleteBranch } from '../api'
import type { Branch } from '../schemas'

interface DeleteBranchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch: Branch | null
}

export function DeleteBranchDialog({ open, onOpenChange, branch }: DeleteBranchDialogProps) {
  const { t } = useTranslation()
  const mutation = useDeleteBranch()

  async function handleConfirm() {
    if (!branch) return
    try {
      await mutation.mutateAsync(branch.id)
      notify(t('staff.branches.toast.deleted'), { type: 'success' })
      onOpenChange(false)
    } catch (err) {
      notify(extractApiMessage(err), { type: 'error' })
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('staff.branches.delete.title')}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {t('staff.branches.delete.description', { name: branch?.name ?? '' })}
              </p>
              <p className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{t('staff.branches.delete.warning')}</span>
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t('staff.branches.delete.submitting') : t('staff.branches.delete.submit')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
