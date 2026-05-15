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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { extractApiMessage } from '@/core/http/error'
import { notify } from '@/core/notify'
import { useReceiveSupplyTransfer } from '../api'
import { receiveTransferFormSchema, type SupplyTransfer, type ReceiveTransferFormInput } from '../schemas'

interface ReceiveTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transfer: SupplyTransfer | null
}

export function ReceiveTransferDialog({
  open,
  onOpenChange,
  transfer,
}: ReceiveTransferDialogProps) {
  const [apiError, setApiError] = useState<string | null>(null)
  const mutation = useReceiveSupplyTransfer()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReceiveTransferFormInput>({
    resolver: zodResolver(receiveTransferFormSchema),
    values: transfer
      ? {
          notes: '',
          items: transfer.items.map((item) => ({
            supplyType:       item.supplyType,
            quantityReceived: item.quantitySent,
          })),
        }
      : undefined,
  })

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      reset()
      setApiError(null)
    }
    onOpenChange(isOpen)
  }

  async function onSubmit(data: ReceiveTransferFormInput) {
    if (!transfer) return
    setApiError(null)
    try {
      await mutation.mutateAsync({ id: transfer.id, input: data })
      notify('Transferencia recibida correctamente', { type: 'success' })
      handleClose(false)
    } catch (err) {
      setApiError(extractApiMessage(err))
    }
  }

  const isBusy = isSubmitting || mutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirmar recepción de insumos</DialogTitle>
        </DialogHeader>

        {transfer && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Info de la transferencia */}
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p className="text-xs text-muted-foreground">
                Fecha de envío: {transfer.transferDate}
              </p>
              {transfer.notes && (
                <p className="text-xs text-muted-foreground">Notas: {transfer.notes}</p>
              )}
            </div>

            <Separator />

            {/* Items (readonly excepto quantityReceived) */}
            <div className="space-y-3">
              <span className="text-sm font-medium">Ítems recibidos</span>

              {transfer.items.map((item, index) => (
                <div key={item.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.supplyType}</span>
                    <span className="text-xs text-muted-foreground">
                      Enviado: {item.quantitySent}
                    </span>
                  </div>

                  <input
                    type="hidden"
                    {...register(`items.${index}.supplyType`)}
                    value={item.supplyType}
                  />

                  <div className="space-y-1.5">
                    <label
                      htmlFor={`items.${index}.quantityReceived`}
                      className="text-sm font-medium"
                    >
                      Cantidad recibida <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id={`items.${index}.quantityReceived`}
                      type="number"
                      min="0"
                      step="1"
                      disabled={isBusy}
                      {...register(`items.${index}.quantityReceived`, { valueAsNumber: true })}
                    />
                    {errors.items?.[index]?.quantityReceived && (
                      <p className="text-sm text-destructive">
                        {errors.items[index].quantityReceived?.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Notas globales */}
            <div className="space-y-1.5">
              <label htmlFor="notes" className="text-sm font-medium">
                Notas (opcional)
              </label>
              <Textarea
                id="notes"
                rows={2}
                disabled={isBusy}
                {...register('notes')}
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
                disabled={isBusy}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isBusy}>
                {isBusy ? 'Confirmando...' : 'Confirmar recepción'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
