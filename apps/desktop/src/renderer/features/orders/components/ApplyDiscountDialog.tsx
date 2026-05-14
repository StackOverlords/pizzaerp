import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { extractApiMessage } from '@/core/http/error'
import { useApplyDiscount } from '../api'
import { applyDiscountInputSchema, DISCOUNT_TYPE, type ApplyDiscountInput } from '../schemas'
import { AdminPinChallenge } from './AdminPinChallenge'
import { z } from 'zod'

interface ApplyDiscountDialogProps {
  orderId: string | null
  onOpenChange: (open: boolean) => void
  currentSubtotal?: number
}

type Phase = 'form' | 'submitting'

export function ApplyDiscountDialog({ orderId, onOpenChange, currentSubtotal }: ApplyDiscountDialogProps) {
  const [apiError, setApiError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('form')
  const mutation = useApplyDiscount()

  const schemaWithRefine = applyDiscountInputSchema.superRefine((data, ctx) => {
    if (data.type === DISCOUNT_TYPE.PERCENTAGE && data.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El porcentaje no puede superar 100%',
        path: ['value'],
      })
    }
    if (data.type === DISCOUNT_TYPE.AMOUNT && currentSubtotal != null && data.value > currentSubtotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `El descuento no puede superar el subtotal (${currentSubtotal})`,
        path: ['value'],
      })
    }
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<ApplyDiscountInput>({
    resolver: zodResolver(schemaWithRefine),
    defaultValues: { adminUsername: '', adminPin: '', type: DISCOUNT_TYPE.AMOUNT, value: 0, reason: '' },
  })

  const discountType = watch('type')
  const isPercentage = discountType === DISCOUNT_TYPE.PERCENTAGE
  const isSubmitting = phase === 'submitting'

  function handleClose(open: boolean) {
    if (!open) {
      reset()
      setApiError(null)
      setPhase('form')
    }
    onOpenChange(open)
  }

  async function onSubmit(data: ApplyDiscountInput): Promise<void> {
    if (!orderId) return
    setApiError(null)
    setPhase('submitting')
    try {
      await mutation.mutateAsync({ id: orderId, input: data })
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
          <DialogTitle>Aplicar descuento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <AdminPinChallenge
            control={control}
            errors={errors}
            usernameFieldName="adminUsername"
            pinFieldName="adminPin"
            disabled={isSubmitting}
          />

          {/* Discount type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de descuento</label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={DISCOUNT_TYPE.AMOUNT} id="discount-amount" />
                    <label htmlFor="discount-amount" className="text-sm cursor-pointer">Monto fijo</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={DISCOUNT_TYPE.PERCENTAGE} id="discount-pct" />
                    <label htmlFor="discount-pct" className="text-sm cursor-pointer">Porcentaje</label>
                  </div>
                </RadioGroup>
              )}
            />
            {errors.type && (
              <p className="text-sm text-destructive">{String(errors.type.message)}</p>
            )}
          </div>

          {/* Value */}
          <div className="space-y-1.5">
            <label htmlFor="discount-value" className="text-sm font-medium">
              Valor {isPercentage ? '(%)' : '(Gs.)'}
            </label>
            <div className="relative">
              <Input
                id="discount-value"
                type="number"
                step={isPercentage ? '1' : '0.01'}
                min="0.01"
                max={isPercentage ? '100' : undefined}
                disabled={isSubmitting}
                className="pr-10"
                {...register('value', { valueAsNumber: true })}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                {isPercentage ? '%' : 'Gs.'}
              </span>
            </div>
            {errors.value && (
              <p className="text-sm text-destructive">{errors.value.message}</p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label htmlFor="discount-reason" className="text-sm font-medium">
              Motivo <span className="text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
              id="discount-reason"
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
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Aplicando...' : 'Aplicar descuento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
