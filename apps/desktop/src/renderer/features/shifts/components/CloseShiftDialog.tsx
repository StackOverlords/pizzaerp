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
import { Textarea } from '@/components/ui/textarea'
import { extractApiMessage } from '@/core/http/error'
import { useCloseShift } from '../api'
import { closeShiftInputSchema, type CloseShiftInput, type Closure } from '../schemas'
import { ClosureSummary } from './ClosureSummary'

type CloseDialogPhase =
  | { phase: 'form' }
  | { phase: 'submitting' }
  | { phase: 'summary'; closure: Closure }

interface CloseShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CloseShiftDialog({ open, onOpenChange }: CloseShiftDialogProps) {
  const { t } = useTranslation()
  const [phaseState, setPhaseState] = useState<CloseDialogPhase>({ phase: 'form' })
  const [apiError, setApiError] = useState<string | null>(null)
  const mutation = useCloseShift()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CloseShiftInput>({
    resolver: zodResolver(closeShiftInputSchema),
    defaultValues: { declaredCash: 0, declaredQrCount: 0, notes: '' },
  })

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      reset()
      setApiError(null)
      setPhaseState({ phase: 'form' })
    }
    onOpenChange(isOpen)
  }

  async function onSubmit(data: CloseShiftInput): Promise<void> {
    setApiError(null)
    setPhaseState({ phase: 'submitting' })
    try {
      const response = await mutation.mutateAsync(data)
      setPhaseState({ phase: 'summary', closure: response.closure })
    } catch (err) {
      setApiError(extractApiMessage(err))
      setPhaseState({ phase: 'form' })
    }
  }

  const isSubmitting = phaseState.phase === 'submitting' || mutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('shifts.close.title')}</DialogTitle>
        </DialogHeader>

        {phaseState.phase === 'summary' ? (
          <>
            <ClosureSummary closure={phaseState.closure} />
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>
                {t('shifts.summary.close')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Declared cash */}
            <div className="space-y-1.5">
              <label htmlFor="declaredCash" className="text-sm font-medium">
                {t('shifts.close.declaredCash')}
              </label>
              <Input
                id="declaredCash"
                type="number"
                step="0.01"
                min="0"
                {...register('declaredCash', { valueAsNumber: true })}
              />
              {errors.declaredCash && (
                <p className="text-sm text-destructive">{errors.declaredCash.message}</p>
              )}
            </div>

            {/* Declared QR count */}
            <div className="space-y-1.5">
              <label htmlFor="declaredQrCount" className="text-sm font-medium">
                {t('shifts.close.declaredQrCount')}
              </label>
              <Input
                id="declaredQrCount"
                type="number"
                step="1"
                min="0"
                {...register('declaredQrCount', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">{t('shifts.close.helpQrCount')}</p>
              {errors.declaredQrCount && (
                <p className="text-sm text-destructive">{errors.declaredQrCount.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label htmlFor="notes" className="text-sm font-medium">
                {t('shifts.close.notes')}
              </label>
              <Textarea
                id="notes"
                rows={3}
                {...register('notes')}
              />
              {errors.notes && (
                <p className="text-sm text-destructive">{errors.notes.message}</p>
              )}
            </div>

            {apiError && (
              <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{apiError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isSubmitting}
              >
                {t('confirm.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('shifts.close.submitting') : t('shifts.close.submit')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
