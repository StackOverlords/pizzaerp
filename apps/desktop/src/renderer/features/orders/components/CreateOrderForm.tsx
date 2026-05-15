import { useState, useRef } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import { extractApiMessage } from '@/core/http/error'
import { notify } from '@/core/notify'
import { openRoute } from '@/core/tabs/open-route'
import { useCreateOrder, useDishIngredients } from '../api'
import { createOrderInputSchema, type CreateOrderInput, type Dish } from '../schemas'
import type { DishIngredientForOrder } from '@/features/menu/schemas'
import { DISH_INGREDIENT_BEHAVIOR } from '@/features/menu/schemas'
import { DishPicker } from './DishPicker'

type BuilderExtra = { dishIngredientId: string; quantity: number }
type BuilderExclusion = { dishIngredientId: string }

type IngredientCacheMeta = {
  name: string
  extraCost: number | null
  behavior: string
}

export function CreateOrderForm() {
  const [apiError, setApiError] = useState<string | null>(null)
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null)
  const [builderQtyStr, setBuilderQtyStr] = useState('1')
  const builderQty = Math.max(1, Number(builderQtyStr) || 1)
  const [builderNotes, setBuilderNotes] = useState('')
  const [builderExtras, setBuilderExtras] = useState<BuilderExtra[]>([])
  const [builderExclusions, setBuilderExclusions] = useState<BuilderExclusion[]>([])
  const dishCache = useRef<Map<string, Dish>>(new Map())
  const ingredientLabelCache = useRef<Map<string, IngredientCacheMeta>>(new Map())
  const mutation = useCreateOrder()

  const { data: dishIngredients = [] } = useDishIngredients(selectedDishId)

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
    setBuilderExtras([])
    setBuilderExclusions([])
  }

  function toggleIngredient(di: DishIngredientForOrder) {
    if (di.behavior === DISH_INGREDIENT_BEHAVIOR.INCLUDED) {
      // INCLUDED: default is checked (in dish). Unchecking = add exclusion
      const existing = builderExclusions.find((x) => x.dishIngredientId === di.id)
      if (existing) {
        // Re-check: remove exclusion
        setBuilderExclusions((prev) => prev.filter((x) => x.dishIngredientId !== di.id))
      } else {
        // Uncheck: add exclusion
        setBuilderExclusions((prev) => [...prev, { dishIngredientId: di.id }])
      }
    } else {
      // OPTIONAL or EXTRA: default is unchecked. Checking = add extra
      const existing = builderExtras.find((e) => e.dishIngredientId === di.id)
      if (existing) {
        // Uncheck: remove extra
        setBuilderExtras((prev) => prev.filter((e) => e.dishIngredientId !== di.id))
      } else {
        // Check: add extra with quantity=1
        setBuilderExtras((prev) => [...prev, { dishIngredientId: di.id, quantity: 1 }])
      }
    }
  }

  function isIngredientChecked(di: DishIngredientForOrder): boolean {
    if (di.behavior === DISH_INGREDIENT_BEHAVIOR.INCLUDED) {
      // Checked unless it's in exclusions
      return !builderExclusions.some((x) => x.dishIngredientId === di.id)
    }
    // OPTIONAL / EXTRA: checked if in extras
    return builderExtras.some((e) => e.dishIngredientId === di.id)
  }

  function handleAddItem() {
    if (!selectedDishId) return

    // Populate the ingredient label cache for display in right panel
    for (const di of dishIngredients) {
      ingredientLabelCache.current.set(di.id, {
        name: di.ingredient.name,
        extraCost: di.extraCost,
        behavior: di.behavior,
      })
    }

    append({
      dishId:     selectedDishId,
      quantity:   builderQty,
      notes:      builderNotes || undefined,
      extras:     builderExtras.length > 0 ? builderExtras : undefined,
      exclusions: builderExclusions.length > 0 ? builderExclusions : undefined,
    })

    setSelectedDishId(null)
    setBuilderQtyStr('1')
    setBuilderNotes('')
    setBuilderExtras([])
    setBuilderExclusions([])
  }

  const subtotal = watchedItems.reduce((sum, item) => {
    const dish = dishCache.current.get(item.dishId)
    if (!dish) return sum
    const extrasCost = (item.extras ?? []).reduce((acc, e) => {
      const meta = ingredientLabelCache.current.get(e.dishIngredientId)
      return acc + (meta?.extraCost ?? 0) * e.quantity
    }, 0)
    return sum + (dish.salePrice + extrasCost) * item.quantity
  }, 0)

  async function onSubmit(data: CreateOrderInput): Promise<void> {
    setApiError(null)
    try {
      await mutation.mutateAsync(data)
      notify('Orden creada correctamente.', { type: 'success' })
      reset()
      dishCache.current.clear()
      ingredientLabelCache.current.clear()
      setSelectedDishId(null)
      setBuilderQtyStr('1')
      setBuilderNotes('')
      setBuilderExtras([])
      setBuilderExclusions([])
      openRoute('orders-list')
    } catch (err) {
      setApiError(extractApiMessage(err))
    }
  }

  // Group ingredients by behavior for the personalization panel
  const includedIngredients = dishIngredients.filter(
    (di) => di.behavior === DISH_INGREDIENT_BEHAVIOR.INCLUDED,
  )
  const optionalIngredients = dishIngredients.filter(
    (di) => di.behavior === DISH_INGREDIENT_BEHAVIOR.OPTIONAL,
  )
  const extraIngredients = dishIngredients.filter(
    (di) => di.behavior === DISH_INGREDIENT_BEHAVIOR.EXTRA,
  )

  const hasPersonalization = selectedDishId && dishIngredients.length > 0

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

          {/* Personalization panel — only shown when dish has ingredients */}
          {hasPersonalization && (
            <div className="rounded-md border p-3 space-y-2 max-h-64 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Personalización
              </p>

              {includedIngredients.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Quitar</p>
                  {includedIngredients.map((di) => (
                    <label
                      key={di.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={isIngredientChecked(di)}
                        onCheckedChange={() => toggleIngredient(di)}
                        disabled={isSubmitting}
                      />
                      <span>{di.ingredient.name}</span>
                    </label>
                  ))}
                </div>
              )}

              {optionalIngredients.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Opcionales</p>
                  {optionalIngredients.map((di) => (
                    <label
                      key={di.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={isIngredientChecked(di)}
                        onCheckedChange={() => toggleIngredient(di)}
                        disabled={isSubmitting}
                      />
                      <span>{di.ingredient.name}</span>
                      <span className="text-muted-foreground text-xs">+$0</span>
                    </label>
                  ))}
                </div>
              )}

              {extraIngredients.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Extras</p>
                  {extraIngredients.map((di) => (
                    <label
                      key={di.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={isIngredientChecked(di)}
                        onCheckedChange={() => toggleIngredient(di)}
                        disabled={isSubmitting}
                      />
                      <span>{di.ingredient.name}</span>
                      {di.extraCost != null && di.extraCost > 0 && (
                        <Badge variant="secondary" className="text-xs py-0">
                          +{formatCurrency(di.extraCost)}
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Cantidad</label>
              <Input
                type="number"
                min={1}
                value={builderQtyStr}
                onChange={(e) => setBuilderQtyStr(e.target.value)}
                onBlur={() => setBuilderQtyStr(String(builderQty))}
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
              <div className="space-y-2 overflow-y-auto max-h-64">
                {fields.map((field, index) => {
                  const dish = dishCache.current.get(field.dishId)
                  const item = watchedItems[index]
                  const extrasCost = (item?.extras ?? []).reduce((acc, e) => {
                    const meta = ingredientLabelCache.current.get(e.dishIngredientId)
                    return acc + (meta?.extraCost ?? 0) * e.quantity
                  }, 0)
                  const effectiveUnitPrice = (dish?.salePrice ?? 0) + extrasCost
                  return (
                    <div key={field.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{dish?.name ?? field.dishId}</p>
                          {item?.notes && (
                            <p className="text-xs text-muted-foreground truncate">{item.notes}</p>
                          )}
                        </div>
                        <span className="text-muted-foreground shrink-0">×{item?.quantity ?? field.quantity}</span>
                        <span className="shrink-0 text-right w-20">
                          {dish ? formatCurrency(effectiveUnitPrice * (item?.quantity ?? field.quantity)) : '—'}
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
                      {/* Extras sub-lines */}
                      {item?.extras && item.extras.length > 0 && (
                        <ul className="ml-2 mt-0.5 text-xs text-muted-foreground space-y-0.5">
                          {item.extras.map((e, i) => {
                            const meta = ingredientLabelCache.current.get(e.dishIngredientId)
                            const cost = (meta?.extraCost ?? 0) * e.quantity
                            return (
                              <li key={i}>
                                + {meta?.name ?? e.dishIngredientId}
                                {e.quantity > 1 ? ` ×${e.quantity}` : ''}
                                {cost > 0 && <span> (+{formatCurrency(cost)})</span>}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                      {/* Exclusions sub-lines */}
                      {item?.exclusions && item.exclusions.length > 0 && (
                        <ul className="ml-2 mt-0.5 text-xs text-muted-foreground space-y-0.5">
                          {item.exclusions.map((x, i) => {
                            const meta = ingredientLabelCache.current.get(x.dishIngredientId)
                            return (
                              <li key={i}>
                                &minus; Sin {meta?.name ?? x.dishIngredientId}
                              </li>
                            )
                          })}
                        </ul>
                      )}
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
