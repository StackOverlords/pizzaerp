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
import { useOpenShift } from '../api'
import { openShiftInputSchema, type OpenShiftInput } from '../schemas'

interface OpenShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OpenShiftDialog({ open, onOpenChange }: OpenShiftDialogProps) {
  const { t } = useTranslation()
  const [apiError, setApiError] = useState<string | null>(null)
  const mutation = useOpenShift()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OpenShiftInput>({
    resolver: zodResolver(openShiftInputSchema),
    defaultValues: { initialCash: 0 },
  })

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      reset()
      setApiError(null)
    }
    onOpenChange(isOpen)
  }

  async function onSubmit(data: OpenShiftInput): Promise<void> {
    setApiError(null)
    try {
      await mutation.mutateAsync(data)
      handleClose(false)
    } catch (err) {
      setApiError(extractApiMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('shifts.open.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="initialCash" className="text-sm font-medium">
              {t('shifts.open.initialCash')}
            </label>
            <Input
              id="initialCash"
              type="number"
              step="0.01"
              min="0"
              {...register('initialCash', { valueAsNumber: true })}
            />
            {errors.initialCash && (
              <p className="text-sm text-destructive">{errors.initialCash.message}</p>
            )}
          </div>

          {apiError && (
            <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{apiError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              {t('confirm.cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t('shifts.open.submitting') : t('shifts.open.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
