import { useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2, PlusCircle } from 'lucide-react'
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
import { useBranches } from '@/features/staff/api'
import { useSupplyTypes, useCreateSupplyTransfer } from '../api'
import { createTransferFormSchema, type CreateTransferFormInput } from '../schemas'

interface CreateTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTransferDialog({ open, onOpenChange }: CreateTransferDialogProps) {
  const [apiError, setApiError] = useState<string | null>(null)
  const { data: branches = [], isLoading: loadingBranches } = useBranches()
  const { data: supplyTypes = [], isLoading: loadingTypes } = useSupplyTypes()
  const mutation = useCreateSupplyTransfer()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransferFormInput>({
    resolver: zodResolver(createTransferFormSchema),
    defaultValues: {
      toBranchId:   '',
      transferDate: new Date().toISOString().split('T')[0],
      notes:        '',
      items:        [{ supplyType: '', quantitySent: 1, notes: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      reset()
      setApiError(null)
    }
    onOpenChange(isOpen)
  }

  async function onSubmit(data: CreateTransferFormInput) {
    setApiError(null)
    try {
      await mutation.mutateAsync(data)
      notify('Transferencia creada correctamente', { type: 'success' })
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
          <DialogTitle>Registrar envío de insumos</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Sucursal destino */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Sucursal destino <span className="text-destructive">*</span>
            </label>
            <Controller
              control={control}
              name="toBranchId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) => { if (val) field.onChange(val) }}
                  disabled={isBusy || loadingBranches}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {loadingBranches
                        ? 'Cargando...'
                        : (branches.find((b) => b.id === field.value)?.name ?? 'Seleccionar sucursal...')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.toBranchId && (
              <p className="text-sm text-destructive">{errors.toBranchId.message}</p>
            )}
          </div>

          {/* Fecha de transferencia */}
          <div className="space-y-1.5">
            <label htmlFor="transferDate" className="text-sm font-medium">
              Fecha <span className="text-destructive">*</span>
            </label>
            <Input
              id="transferDate"
              type="date"
              disabled={isBusy}
              {...register('transferDate')}
            />
            {errors.transferDate && (
              <p className="text-sm text-destructive">{errors.transferDate.message}</p>
            )}
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

          <Separator />

          {/* Items dinámicos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Ítems</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ supplyType: '', quantitySent: 1, notes: '' })}
                disabled={isBusy}
              >
                <PlusCircle className="size-4 mr-1" />
                Agregar ítem
              </Button>
            </div>

            {errors.items?.root && (
              <p className="text-sm text-destructive">{errors.items.root.message}</p>
            )}

            {fields.map((fieldItem, index) => (
              <div key={fieldItem.id} className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Ítem {index + 1}</span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={isBusy}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>

                {/* Tipo de insumo */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Tipo de insumo <span className="text-destructive">*</span>
                  </label>
                  <Controller
                    control={control}
                    name={`items.${index}.supplyType`}
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
                  {errors.items?.[index]?.supplyType && (
                    <p className="text-sm text-destructive">
                      {errors.items[index].supplyType?.message}
                    </p>
                  )}
                </div>

                {/* Cantidad enviada */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={`items.${index}.quantitySent`}
                    className="text-sm font-medium"
                  >
                    Cantidad <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id={`items.${index}.quantitySent`}
                    type="number"
                    min="1"
                    step="1"
                    disabled={isBusy}
                    {...register(`items.${index}.quantitySent`, { valueAsNumber: true })}
                  />
                  {errors.items?.[index]?.quantitySent && (
                    <p className="text-sm text-destructive">
                      {errors.items[index].quantitySent?.message}
                    </p>
                  )}
                </div>

                {/* Notas del ítem */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={`items.${index}.notes`}
                    className="text-sm font-medium"
                  >
                    Notas del ítem (opcional)
                  </label>
                  <Input
                    id={`items.${index}.notes`}
                    type="text"
                    disabled={isBusy}
                    {...register(`items.${index}.notes`)}
                  />
                </div>
              </div>
            ))}
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
              {isBusy ? 'Guardando...' : 'Registrar envío'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
