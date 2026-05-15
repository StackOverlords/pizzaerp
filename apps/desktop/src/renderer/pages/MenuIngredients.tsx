import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { eventBus } from '@/core/events/event-bus'
import { useAuthStore } from '@/core/auth/store'
import { confirm } from '@/core/confirm'
import { notify } from '@/core/notify'
import { extractApiMessage } from '@/core/http/error'
import { IngredientTable } from '@/features/menu/components/IngredientTable'
import { IngredientFormDialog } from '@/features/menu/components/IngredientFormDialog'
import { useDeactivateIngredient } from '@/features/menu/api'
import type { Ingredient } from '@/features/menu/schemas'

export default function MenuIngredientsPage() {
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))
  const deactivateMutation = useDeactivateIngredient()

  const [ingredientFormOpen, setIngredientFormOpen] = useState(false)
  const [ingredientFormMode, setIngredientFormMode] = useState<'create' | 'edit'>('create')
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)

  useEffect(() => {
    const unsub = eventBus.on('menu.ingredientDialog.requested', ({ mode }) => {
      setIngredientFormMode(mode)
      setSelectedIngredient(null)
      setIngredientFormOpen(true)
    })
    return unsub
  }, [])

  function handleEdit(ingredient: Ingredient) {
    setSelectedIngredient(ingredient)
    setIngredientFormMode('edit')
    setIngredientFormOpen(true)
  }

  async function handleDeactivate(ingredient: Ingredient) {
    const ok = await confirm({
      title: 'Desactivar ingrediente',
      description: `¿Desactivar "${ingredient.name}"? Aparecerá como inactivo en el listado.`,
      confirmLabel: 'Desactivar',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await deactivateMutation.mutateAsync(ingredient.id)
      notify('Ingrediente desactivado correctamente', { type: 'success' })
    } catch (err) {
      notify(extractApiMessage(err), { type: 'error' })
    }
  }

  function handleNewIngredient() {
    setSelectedIngredient(null)
    setIngredientFormMode('create')
    setIngredientFormOpen(true)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Ingredientes</h1>
        {isAdmin && (
          <Button onClick={handleNewIngredient} size="sm">
            Nuevo ingrediente
          </Button>
        )}
      </div>

      <IngredientTable onEdit={handleEdit} onDeactivate={handleDeactivate} />

      <IngredientFormDialog
        open={ingredientFormOpen}
        onOpenChange={setIngredientFormOpen}
        mode={ingredientFormMode}
        ingredient={selectedIngredient}
      />
    </div>
  )
}
