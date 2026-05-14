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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { extractApiMessage } from '@/core/http/error'
import { usePayOrder } from '../api'
import { payOrderInputSchema, PAYMENT_METHOD, type PayOrderInput } from '../schemas'
import { formatCurrency } from '@/lib/format'

interface PayOrderDialogProps {
  orderId: string | null
  onOpenChange: (open: boolean) => void
}

type Phase = 'form' | 'submitting' | 'success'

interface SuccessData {
  method: string
  amount?: number
  reference?: string | null
}

export function PayOrderDialog({ orderId, onOpenChange }: PayOrderDialogProps) {
  const [apiError, setApiError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('form')
  const [successData, setSuccessData] = useState<SuccessData | null>(null)
  const mutation = usePayOrder()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<PayOrderInput>({
    resolver: zodResolver(payOrderInputSchema),
    defaultValues: { method: PAYMENT_METHOD.CASH, reference: '' },
  })

  const method = watch('method')
  const isCash = method === PAYMENT_METHOD.CASH
  const isSubmitting = phase === 'submitting'

  function handleClose(open: boolean) {
    if (!open) {
      reset()
      setApiError(null)
      setPhase('form')
      setSuccessData(null)
    }
    onOpenChange(open)
  }

  async function onSubmit(data: PayOrderInput): Promise<void> {
    if (!orderId) return
    setApiError(null)
    setPhase('submitting')
    try {
      const response = await mutation.mutateAsync({ id: orderId, input: data })
      setSuccessData({
        method: response.payment.method,
        amount: response.payment.amount,
        reference: response.payment.reference,
      })
      setPhase('success')
    } catch (err) {
      setApiError(extractApiMessage(err))
      setPhase('form')
    }
  }

  return (
    <Dialog open={!!orderId} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cobrar orden</DialogTitle>
        </DialogHeader>

        {phase === 'success' && successData ? (
          <>
            <div className="space-y-3 py-2">
              <p className="text-sm font-medium text-green-700">Pago registrado correctamente.</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Método</span>
                <span>{successData.method === PAYMENT_METHOD.CASH ? 'Efectivo' : 'QR'}</span>
                {successData.amount != null && successData.amount > 0 && (
                  <>
                    <span className="text-muted-foreground">Monto</span>
                    <span>{formatCurrency(successData.amount)}</span>
                  </>
                )}
                {successData.reference && (
                  <>
                    <span className="text-muted-foreground">Referencia</span>
                    <span>{successData.reference}</span>
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Payment method */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Método de pago</label>
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={PAYMENT_METHOD.CASH} id="method-cash" />
                      <label htmlFor="method-cash" className="text-sm cursor-pointer">Efectivo</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={PAYMENT_METHOD.QR} id="method-qr" />
                      <label htmlFor="method-qr" className="text-sm cursor-pointer">QR</label>
                    </div>
                  </RadioGroup>
                )}
              />
              {errors.method && (
                <p className="text-sm text-destructive">{String(errors.method.message)}</p>
              )}
            </div>

            {/* Amount — CASH only */}
            {isCash && (
              <div className="space-y-1.5">
                <label htmlFor="pay-amount" className="text-sm font-medium">Monto recibido</label>
                <Input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  disabled={isSubmitting}
                  {...register('amount', { valueAsNumber: true })}
                />
                {'amount' in errors && errors.amount && (
                  <p className="text-sm text-destructive">{String(errors.amount.message)}</p>
                )}
              </div>
            )}

            {/* Reference — always shown */}
            <div className="space-y-1.5">
              <label htmlFor="pay-reference" className="text-sm font-medium">
                Referencia <span className="text-muted-foreground">(opcional)</span>
              </label>
              <Input
                id="pay-reference"
                type="text"
                disabled={isSubmitting}
                placeholder="Nro. comprobante, etc."
                {...register('reference')}
              />
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
                {isSubmitting ? 'Procesando...' : 'Cobrar'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
