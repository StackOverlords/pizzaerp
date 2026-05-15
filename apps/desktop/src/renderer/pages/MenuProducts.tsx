import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { eventBus } from '@/core/events/event-bus'
import { useAuthStore } from '@/core/auth/store'
import { confirm } from '@/core/confirm'
import { notify } from '@/core/notify'
import { extractApiMessage } from '@/core/http/error'
import { DishTable } from '@/features/menu/components/DishTable'
import { DishFormDialog } from '@/features/menu/components/DishFormDialog'
import { CloneDishDialog } from '@/features/menu/components/CloneDishDialog'
import { DishIngredientsSheet } from '@/features/menu/components/DishIngredientsSheet'
import { useDeactivateDish } from '@/features/menu/api'
import type { Dish } from '@/features/menu/schemas'

export default function MenuProductsPage() {
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))
  const deactivateMutation = useDeactivateDish()

  const [dishFormOpen, setDishFormOpen] = useState(false)
  const [dishFormMode, setDishFormMode] = useState<'create' | 'edit'>('create')
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null)

  const [cloneDialogOpen, setCloneDialogOpen] = useState(false)
  const [cloneTargetDish, setCloneTargetDish] = useState<Dish | null>(null)

  const [ingredientsSheetOpen, setIngredientsSheetOpen] = useState(false)
  const [ingredientsDish, setIngredientsDish]           = useState<Dish | null>(null)

  useEffect(() => {
    const unsub = eventBus.on('menu.dishDialog.requested', ({ mode }) => {
      setDishFormMode(mode)
      setSelectedDish(null)
      setDishFormOpen(true)
    })
    return unsub
  }, [])

  function handleEdit(dish: Dish) {
    setSelectedDish(dish)
    setDishFormMode('edit')
    setDishFormOpen(true)
  }

  function handleClone(dish: Dish) {
    setCloneTargetDish(dish)
    setCloneDialogOpen(true)
  }

  async function handleDeactivate(dish: Dish) {
    const ok = await confirm({
      title: 'Desactivar plato',
      description: `¿Desactivar "${dish.name}"? Aparecerá como inactivo en el listado y dejará de mostrarse a los cajeros.`,
      confirmLabel: 'Desactivar',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await deactivateMutation.mutateAsync(dish.id)
      notify('Plato desactivado correctamente', { type: 'success' })
    } catch (err) {
      notify(extractApiMessage(err), { type: 'error' })
    }
  }

  function handleManageIngredients(dish: Dish) {
    setIngredientsDish(dish)
    setIngredientsSheetOpen(true)
  }

  function handleNewDish() {
    setSelectedDish(null)
    setDishFormMode('create')
    setDishFormOpen(true)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Productos</h1>
        {isAdmin && (
          <Button onClick={handleNewDish} size="sm">
            Nuevo plato
          </Button>
        )}
      </div>

      <DishTable
        onEdit={handleEdit}
        onClone={handleClone}
        onDeactivate={handleDeactivate}
        onManageIngredients={handleManageIngredients}
      />

      <DishFormDialog
        open={dishFormOpen}
        onOpenChange={setDishFormOpen}
        mode={dishFormMode}
        dish={selectedDish}
      />

      <CloneDishDialog
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        dish={cloneTargetDish}
      />

      <DishIngredientsSheet
        open={ingredientsSheetOpen}
        onOpenChange={setIngredientsSheetOpen}
        dishId={ingredientsDish?.id ?? null}
        dishName={ingredientsDish?.name ?? ''}
      />
    </div>
  )
}
