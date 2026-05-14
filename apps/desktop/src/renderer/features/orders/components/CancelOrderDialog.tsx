import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { extractApiMessage } from '@/core/http/error'
import { useTenantSettings } from '@/features/settings/api'
import { useCancelOrder } from '../api'
import { cancelOrderInputSchema, type CancelOrderInput } from '../schemas'
import { AdminPinChallenge } from './AdminPinChallenge'

interface CancelOrderDialogProps {
  orderId: string | null
  onOpenChange: (open: boolean) => void
}

type Phase = 'form' | 'submitting'

export function CancelOrderDialog({ orderId, onOpenChange }: CancelOrderDialogProps) {
  const [apiError, setApiError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('form')
  const mutation = useCancelOrder()
  const { data: settings } = useTenantSettings()
  const requirePin = settings?.requirePinForCancel ?? true

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CancelOrderInput>({
    resolver: zodResolver(cancelOrderInputSchema),
    defaultValues: { adminPin: '', reason: '' },
  })

  const isSubmitting = phase === 'submitting'

  function handleClose(open: boolean) {
    if (!open) {
      reset()
      setApiError(null)
      setPhase('form')
    }
    onOpenChange(open)
  }

  async function onSubmit(data: CancelOrderInput): Promise<void> {
    if (!orderId) return
    setApiError(null)
    setPhase('submitting')
    try {
      const input = { ...data, adminPin: data.adminPin || undefined }
      await mutation.mutateAsync({ id: orderId, input })
      handleClose(false)
    } catch (err) {
      setApiError(extractApiMessage(err))
      setPhase('form')
    }
  }

  return (
    <Dialog open={!!orderId} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancelar orden</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {requirePin && (
            <AdminPinChallenge
              control={control}
              errors={errors}
              pinFieldName="adminPin"
              disabled={isSubmitting}
            />
          )}

          <div className="space-y-1.5">
            <label htmlFor="cancel-reason" className="text-sm font-medium">
              Motivo <span className="text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
              id="cancel-reason"
              rows={2}
              maxLength={500}
              disabled={isSubmitting}
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
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
              Volver
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Cancelando...' : 'Confirmar cancelación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
