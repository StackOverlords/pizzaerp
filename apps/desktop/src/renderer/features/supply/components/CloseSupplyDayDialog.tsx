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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { extractApiMessage } from '@/core/http/error'
import { notify } from '@/core/notify'
import { useSupplyTypes, useSupplyClosingSummary, useCloseSupplyDay } from '../api'
import { closeSupplyDayFormSchema, type CloseSupplyDayFormInput } from '../schemas'

interface CloseSupplyDayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CloseSupplyDayDialog({ open, onOpenChange }: CloseSupplyDayDialogProps) {
  const [apiError, setApiError] = useState<string | null>(null)
  const { data: supplyTypes = [], isLoading: loadingTypes } = useSupplyTypes()
  const mutation = useCloseSupplyDay()

  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CloseSupplyDayFormInput>({
    resolver: zodResolver(closeSupplyDayFormSchema),
    defaultValues: {
      closureDate:     today,
      supplyType:      '',
      soldCount:       0,
      actualRemaining: 0,
      notes:           '',
    },
  })

  const watchedDate       = watch('closureDate')
  const watchedSupplyType = watch('supplyType')

  const summaryDateKey = watchedDate && watchedSupplyType ? watchedDate : null
  const { data: summary = [] } = useSupplyClosingSummary(summaryDateKey)

  const summaryItem = summary.find((s) => s.supplyType === watchedSupplyType)

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      reset()
      setApiError(null)
    }
    onOpenChange(isOpen)
  }

  async function onSubmit(data: CloseSupplyDayFormInput) {
    setApiError(null)
    try {
      await mutation.mutateAsync(data)
      notify('Cierre diario registrado correctamente', { type: 'success' })
      handleClose(false)
    } catch (err) {
      setApiError(extractApiMessage(err))
    }
  }

  const isBusy = isSubmitting || mutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar día de insumos</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Fecha */}
          <div className="space-y-1.5">
            <label htmlFor="closureDate" className="text-sm font-medium">
              Fecha <span className="text-destructive">*</span>
            </label>
            <Input
              id="closureDate"
              type="date"
              disabled={isBusy}
              {...register('closureDate')}
            />
            {errors.closureDate && (
              <p className="text-sm text-destructive">{errors.closureDate.message}</p>
            )}
          </div>

          {/* Tipo de insumo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Tipo de insumo <span className="text-destructive">*</span>
            </label>
            <Controller
              control={control}
              name="supplyType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) => { if (val) field.onChange(val) }}
                  disabled={isBusy || loadingTypes}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {loadingTypes ? 'Cargando...' : (field.value || 'Seleccionar...')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {supplyTypes.filter((st) => st.active).map((st) => (
                      <SelectItem key={st.id} value={st.name}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.supplyType && (
              <p className="text-sm text-destructive">{errors.supplyType.message}</p>
            )}
          </div>

          {/* Resumen del día (readonly) — solo si ambos están seleccionados */}
          {summaryItem && (
            <>
              <Separator />
              <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Resumen del día
                </p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock inicial:</span>
                  <span className="font-medium">{summaryItem.initialCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mermas registradas:</span>
                  <span className="font-medium">{summaryItem.wastageCount}</span>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Vendidos */}
          <div className="space-y-1.5">
            <label htmlFor="soldCount" className="text-sm font-medium">
              Vendidos <span className="text-destructive">*</span>
            </label>
            <Input
              id="soldCount"
              type="number"
              min="0"
              step="1"
              disabled={isBusy}
              {...register('soldCount', { valueAsNumber: true })}
            />
            {errors.soldCount && (
              <p className="text-sm text-destructive">{errors.soldCount.message}</p>
            )}
          </div>

          {/* Stock real restante */}
          <div className="space-y-1.5">
            <label htmlFor="actualRemaining" className="text-sm font-medium">
              Stock real restante <span className="text-destructive">*</span>
            </label>
            <Input
              id="actualRemaining"
              type="number"
              min="0"
              step="1"
              disabled={isBusy}
              {...register('actualRemaining', { valueAsNumber: true })}
            />
            {errors.actualRemaining && (
              <p className="text-sm text-destructive">{errors.actualRemaining.message}</p>
            )}
          </div>

          {/* Notas */}
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
              {isBusy ? 'Guardando...' : 'Registrar cierre'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
