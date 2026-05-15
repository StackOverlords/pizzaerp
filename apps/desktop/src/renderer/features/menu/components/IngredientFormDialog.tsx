import { FormDialog, defineFields } from '@/components/schema-form'
import { notify } from '@/core/notify'
import { useCreateIngredient, useUpdateIngredient } from '../api'
import { ingredientFormSchema, type Ingredient, type IngredientFormInput } from '../schemas'

interface IngredientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  ingredient?: Ingredient | null
}

export function IngredientFormDialog({ open, onOpenChange, mode, ingredient }: IngredientFormDialogProps) {
  const createMutation = useCreateIngredient()
  const updateMutation = useUpdateIngredient()
  const isPending = createMutation.isPending || updateMutation.isPending

  const fields = defineFields<IngredientFormInput>([
    {
      id: 'name', type: 'text', label: 'Nombre',
      required: true, placeholder: 'Ej: Harina de trigo', autoFocus: true,
    },
    {
      id: 'purchaseUnit', type: 'text', label: 'Unidad de compra',
      required: true, placeholder: 'Ej: kg, litro, caja',
    },
    {
      id: 'consumptionUnit', type: 'text', label: 'Unidad de consumo',
      required: true, placeholder: 'Ej: g, ml, unidad',
    },
    {
      id: 'conversionFactor', type: 'number', label: 'Factor de conversión',
      required: true, placeholder: '1000', min: 0.0001, step: 0.0001,
    },
    {
      id: 'wastagePercentage', type: 'number', label: 'Merma (%)',
      required: true, placeholder: '0', min: 0, step: 0.01,
    },
  ])

  async function onSubmit(data: IngredientFormInput) {
    if (mode === 'create') {
      await createMutation.mutateAsync(data)
      notify('Ingrediente creado correctamente', { type: 'success' })
    } else {
      if (!ingredient) return
      await updateMutation.mutateAsync({ id: ingredient.id, input: data })
      notify('Ingrediente actualizado correctamente', { type: 'success' })
    }
    onOpenChange(false)
  }

  return (
    <FormDialog<IngredientFormInput>
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Nuevo ingrediente' : 'Editar ingrediente'}
      fields={fields}
      schema={ingredientFormSchema}
      values={
        mode === 'edit' && ingredient
          ? {
              name:              ingredient.name,
              purchaseUnit:      ingredient.purchaseUnit,
              consumptionUnit:   ingredient.consumptionUnit,
              conversionFactor:  ingredient.conversionFactor,
              wastagePercentage: ingredient.wastagePercentage,
            }
          : undefined
      }
      defaultValues={
        mode === 'create'
          ? { name: '', purchaseUnit: '', consumptionUnit: '', conversionFactor: 1, wastagePercentage: 0 }
          : undefined
      }
      onSubmit={onSubmit}
      isPending={isPending}
      submitLabel={mode === 'create' ? 'Crear' : 'Guardar cambios'}
    />
  )
}
