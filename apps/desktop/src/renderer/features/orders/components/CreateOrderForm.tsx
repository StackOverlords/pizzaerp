import { useState, useRef } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/format'
import { extractApiMessage } from '@/core/http/error'
import { notify } from '@/core/notify'
import { openRoute } from '@/core/tabs/open-route'
import { useCreateOrder } from '../api'
import { createOrderInputSchema, type CreateOrderInput, type Dish } from '../schemas'
import { DishPicker } from './DishPicker'

export function CreateOrderForm() {
  const [apiError, setApiError] = useState<string | null>(null)
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null)
  const [builderQty, setBuilderQty] = useState(1)
  const [builderNotes, setBuilderNotes] = useState('')
  const dishCache = useRef<Map<string, Dish>>(new Map())
  const mutation = useCreateOrder()

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderInputSchema),
    defaultValues: { items: [], notes: '' },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')

  function handleDishPickerChange(dishId: string, dish: Dish) {
    dishCache.current.set(dishId, dish)
    setSelectedDishId(dishId)
  }

  function handleAddItem() {
    if (!selectedDishId) return
    append({ dishId: selectedDishId, quantity: builderQty, notes: builderNotes || undefined })
    setSelectedDishId(null)
    setBuilderQty(1)
    setBuilderNotes('')
  }

  const subtotal = watchedItems.reduce((sum, item) => {
    const dish = dishCache.current.get(item.dishId)
    return sum + (dish ? dish.salePrice * item.quantity : 0)
  }, 0)

  async function onSubmit(data: CreateOrderInput): Promise<void> {
    setApiError(null)
    try {
      await mutation.mutateAsync(data)
      notify('Orden creada correctamente.', { type: 'success' })
      reset()
      dishCache.current.clear()
      setSelectedDishId(null)
      setBuilderQty(1)
      setBuilderNotes('')
      openRoute('orders-list')
    } catch (err) {
      setApiError(extractApiMessage(err))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 flex-1 min-h-0">
      {/* Left column — dish builder */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <p className="text-sm font-medium">Agregar platillo</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <DishPicker
            value={selectedDishId}
            onChange={handleDishPickerChange}
            disabled={isSubmitting}
            placeholder="Seleccionar platillo..."
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Cantidad</label>
              <Input
                type="number"
                min={1}
                value={builderQty}
                onChange={(e) => setBuilderQty(Math.max(1, Number(e.target.value)))}
                disabled={isSubmitting}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-[2]">
              <label className="text-xs text-muted-foreground mb-1 block">Notas (opcional)</label>
              <Input
                type="text"
                value={builderNotes}
                onChange={(e) => setBuilderNotes(e.target.value)}
                disabled={isSubmitting}
                placeholder="Sin cebolla, etc."
                className="h-8 text-sm"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            disabled={!selectedDishId || isSubmitting}
            className="w-full"
          >
            Agregar a la orden
          </Button>
        </CardContent>
      </Card>

      {/* Right column — order summary + submit */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <p className="text-sm font-medium">Productos en la orden</p>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 gap-4">
          {/* Items list */}
          <div className="flex-1 min-h-0">
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Agregá un platillo para empezar
              </p>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-48">
                {fields.map((field, index) => {
                  const dish = dishCache.current.get(field.dishId)
                  const item = watchedItems[index]
                  return (
                    <div key={field.id} className="flex items-center gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{dish?.name ?? field.dishId}</p>
                        {item?.notes && (
                          <p className="text-xs text-muted-foreground truncate">{item.notes}</p>
                        )}
                      </div>
                      <span className="text-muted-foreground shrink-0">×{item?.quantity ?? field.quantity}</span>
                      <span className="shrink-0 text-right w-20">
                        {dish ? formatCurrency(dish.salePrice * (item?.quantity ?? field.quantity)) : '—'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => remove(index)}
                        disabled={isSubmitting}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
            {errors.items && !Array.isArray(errors.items) && (
              <p className="text-sm text-destructive mt-2">{errors.items.message}</p>
            )}
          </div>

          {/* Order notes */}
          <div className="space-y-1.5">
            <label htmlFor="order-notes" className="text-sm font-medium">
              Notas de la orden <span className="text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
              id="order-notes"
              rows={2}
              maxLength={500}
              disabled={isSubmitting}
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          {/* Total + submit */}
          <div className="space-y-3">
            <Separator />
            <div className="flex justify-between text-sm font-medium">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total estimado</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {apiError && (
              <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{apiError}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={fields.length === 0 || isSubmitting}
            >
              {isSubmitting ? 'Creando orden...' : 'Crear orden'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
