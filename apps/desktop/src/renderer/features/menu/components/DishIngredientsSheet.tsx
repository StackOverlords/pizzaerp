import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { notify } from '@/core/notify'
import { confirm } from '@/core/confirm'
import { extractApiMessage } from '@/core/http/error'
import {
  useDishIngredients,
  useIngredients,
  useAddDishIngredient,
  useUpdateDishIngredient,
  useRemoveDishIngredient,
} from '../api'
import {
  dishIngredientFormSchema,
  DISH_INGREDIENT_BEHAVIOR,
  type DishIngredientFormInput,
  type DishIngredientForOrder,
} from '../schemas'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DishIngredientsSheetProps {
  open:        boolean
  onOpenChange:(open: boolean) => void
  dishId:      string | null
  dishName:    string
}

// ── Behavior badge ─────────────────────────────────────────────────────────────

const BEHAVIOR_LABEL: Record<string, string> = {
  INCLUDED: 'Incluido',
  OPTIONAL: 'Opcional',
  EXTRA:    'Extra',
}

function BehaviorBadge({ behavior, extraCost }: { behavior: string; extraCost: number | null }) {
  if (behavior === DISH_INGREDIENT_BEHAVIOR.INCLUDED) {
    return <Badge variant="secondary" className="text-xs">{BEHAVIOR_LABEL.INCLUDED}</Badge>
  }
  if (behavior === DISH_INGREDIENT_BEHAVIOR.OPTIONAL) {
    return <Badge variant="outline" className="text-xs border-blue-400 text-blue-600">{BEHAVIOR_LABEL.OPTIONAL}</Badge>
  }
  // EXTRA
  const label = extraCost && extraCost > 0
    ? `${BEHAVIOR_LABEL.EXTRA} +$${extraCost.toFixed(2)}`
    : BEHAVIOR_LABEL.EXTRA
  return <Badge variant="outline" className="text-xs border-green-500 text-green-700">{label}</Badge>
}

// ── Ingredient form dialog ─────────────────────────────────────────────────────

interface IngredientFormDialogProps {
  open:          boolean
  onOpenChange:  (open: boolean) => void
  dishId:        string
  editing:       DishIngredientForOrder | null
  addedIds:      Set<string>
}

function IngredientFormDialog({
  open,
  onOpenChange,
  dishId,
  editing,
  addedIds,
}: IngredientFormDialogProps) {
  const { data: ingredients = [], isLoading: loadingIngredients } = useIngredients({ activeOnly: true })
  const addMutation    = useAddDishIngredient(dishId)
  const updateMutation = useUpdateDishIngredient(dishId)

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<DishIngredientFormInput>({
    resolver: zodResolver(dishIngredientFormSchema),
    defaultValues: editing
      ? {
          ingredientId: editing.ingredientId,
          baseQuantity: editing.baseQuantity,
          behavior:     editing.behavior,
          extraCost:    editing.extraCost ?? 0,
        }
      : {
          ingredientId: '',
          baseQuantity: 1,
          behavior:     DISH_INGREDIENT_BEHAVIOR.INCLUDED,
          extraCost:    0,
        },
  })

  const behavior = watch('behavior')
  const isExtra  = behavior === DISH_INGREDIENT_BEHAVIOR.EXTRA

  // Reset whenever the dialog opens/closes or editing target changes
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset()
    }
    onOpenChange(nextOpen)
  }

  const availableIngredients = editing
    ? ingredients
    : ingredients.filter((i) => !addedIds.has(i.id))

  async function onSubmit(data: DishIngredientFormInput) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ ingredientId: editing.ingredientId, input: data })
        notify('Ingrediente actualizado', { type: 'success' })
      } else {
        await addMutation.mutateAsync(data)
        notify('Ingrediente agregado', { type: 'success' })
      }
      handleOpenChange(false)
    } catch (err) {
      notify(extractApiMessage(err), { type: 'error' })
    }
  }

  const isPending = addMutation.isPending || updateMutation.isPending
  const title     = editing ? 'Editar ingrediente' : 'Agregar ingrediente'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Ingredient select — only shown when adding */}
          {!editing && (
            <div className="space-y-1.5">
              <Label htmlFor="ingredientId">Ingrediente</Label>
              <Controller
                control={control}
                name="ingredientId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loadingIngredients}
                  >
                    <SelectTrigger id="ingredientId">
                      <SelectValue placeholder={loadingIngredients ? 'Cargando...' : 'Seleccionar ingrediente'} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableIngredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name}
                          <span className="ml-1 text-xs text-muted-foreground">({ing.consumptionUnit})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.ingredientId && (
                <p className="text-xs text-destructive">{errors.ingredientId.message}</p>
              )}
            </div>
          )}

          {/* Behavior select */}
          <div className="space-y-1.5">
            <Label htmlFor="behavior">Comportamiento</Label>
            <Controller
              control={control}
              name="behavior"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="behavior">
                    <SelectValue placeholder="Seleccionar comportamiento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DISH_INGREDIENT_BEHAVIOR.INCLUDED}>Incluido</SelectItem>
                    <SelectItem value={DISH_INGREDIENT_BEHAVIOR.OPTIONAL}>Opcional</SelectItem>
                    <SelectItem value={DISH_INGREDIENT_BEHAVIOR.EXTRA}>Extra (costo adicional)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.behavior && (
              <p className="text-xs text-destructive">{errors.behavior.message}</p>
            )}
          </div>

          {/* Base quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="baseQuantity">Cantidad base</Label>
            <Input
              id="baseQuantity"
              type="number"
              step="0.001"
              min="0.001"
              {...register('baseQuantity', { valueAsNumber: true })}
            />
            {errors.baseQuantity && (
              <p className="text-xs text-destructive">{errors.baseQuantity.message}</p>
            )}
          </div>

          {/* Extra cost — visible only when behavior = EXTRA */}
          {isExtra && (
            <div className="space-y-1.5">
              <Label htmlFor="extraCost">Costo extra</Label>
              <Input
                id="extraCost"
                type="number"
                step="0.01"
                min="0"
                {...register('extraCost', { valueAsNumber: true })}
              />
              {errors.extraCost && (
                <p className="text-xs text-destructive">{errors.extraCost.message}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : editing ? 'Guardar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main sheet ─────────────────────────────────────────────────────────────────

export function DishIngredientsSheet({
  open,
  onOpenChange,
  dishId,
  dishName,
}: DishIngredientsSheetProps) {
  const { data: dishIngredients = [], isLoading } = useDishIngredients(dishId)
  const removeMutation = useRemoveDishIngredient(dishId ?? '')

  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingItem, setEditingItem]       = useState<DishIngredientForOrder | null>(null)

  const addedIngredientIds = new Set(dishIngredients.map((di) => di.ingredientId))

  function openAdd() {
    setEditingItem(null)
    setFormDialogOpen(true)
  }

  function openEdit(item: DishIngredientForOrder) {
    setEditingItem(item)
    setFormDialogOpen(true)
  }

  async function handleRemove(item: DishIngredientForOrder) {
    const ok = await confirm({
      title: 'Quitar ingrediente',
      description: `¿Quitar "${item.ingredient.name}" del plato "${dishName}"?`,
      confirmLabel: 'Quitar',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await removeMutation.mutateAsync(item.ingredientId)
      notify('Ingrediente quitado', { type: 'success' })
    } catch (err) {
      notify(extractApiMessage(err), { type: 'error' })
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Ingredientes — {dishName}</SheetTitle>
          </SheetHeader>

          {isLoading && (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          )}

          {!isLoading && dishIngredients.length === 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              Este plato no tiene ingredientes configurados.
            </p>
          )}

          {!isLoading && dishIngredients.length > 0 && (
            <div className="rounded-md border overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Ingrediente</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Comportamiento</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground text-right">Cantidad</th>
                    <th className="px-3 py-2 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {dishIngredients.map((di) => (
                    <tr key={di.id} className="border-t">
                      <td className="px-3 py-2">
                        <span className="font-medium">{di.ingredient.name}</span>
                        <span className="ml-1 text-xs text-muted-foreground">({di.ingredient.consumptionUnit})</span>
                      </td>
                      <td className="px-3 py-2">
                        <BehaviorBadge behavior={di.behavior} extraCost={di.extraCost} />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{di.baseQuantity}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(di)}
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemove(di)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && (
            <>
              {dishIngredients.length > 0 && <Separator className="my-4" />}
              <Button variant="outline" size="sm" onClick={openAdd} className="w-full">
                <Plus size={14} className="mr-1.5" />
                Agregar ingrediente
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>

      {dishId && (
        <IngredientFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          dishId={dishId}
          editing={editingItem}
          addedIds={addedIngredientIds}
        />
      )}
    </>
  )
}
