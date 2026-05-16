import { FormDialog, defineFields } from '@/components/schema-form'
import { notify } from '@/core/notify'
import { useCreateCombo, useUpdateCombo } from '../api'
import { comboFormSchema, type Combo, type ComboFormInput } from '../schemas'
import { timeForInput, timeForApi } from '../schemas'

interface ComboFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  combo?: Combo | null
}

export function ComboFormDialog({ open, onOpenChange, mode, combo }: ComboFormDialogProps) {
  const createMutation = useCreateCombo()
  const updateMutation = useUpdateCombo()
  const isPending = createMutation.isPending || updateMutation.isPending

  const fields = defineFields<ComboFormInput>([
    {
      id: 'name', type: 'text', label: 'Nombre',
      required: true, placeholder: 'Ej: Combo Familiar', autoFocus: true,
    },
    {
      id: 'salePrice', type: 'number', label: 'Precio de venta',
      required: true, min: 0.01, step: 0.01, placeholder: '0.00',
    },
    {
      id: 'description', type: 'textarea', label: 'Descripción',
      placeholder: 'Descripción opcional del combo', rows: 2,
    },
    {
      id: 'availableFrom', type: 'time', label: 'Disponible desde', span: 1,
    },
    {
      id: 'availableTo', type: 'time', label: 'Disponible hasta', span: 1,
    },
  ])

  async function onSubmit(data: ComboFormInput) {
    const payload: ComboFormInput = {
      ...data,
      availableFrom: timeForApi(data.availableFrom),
      availableTo:   timeForApi(data.availableTo),
    }
    if (mode === 'create') {
      await createMutation.mutateAsync(payload)
      notify('Combo creado correctamente', { type: 'success' })
    } else {
      if (!combo) return
      await updateMutation.mutateAsync({ id: combo.id, input: payload })
      notify('Combo actualizado correctamente', { type: 'success' })
    }
    onOpenChange(false)
  }

  const editValues: ComboFormInput | undefined =
    mode === 'edit' && combo
      ? {
          name:          combo.name,
          description:   combo.description,
          salePrice:     combo.salePrice,
          availableFrom: timeForInput(combo.availableFrom),
          availableTo:   timeForInput(combo.availableTo),
        }
      : undefined

  return (
    <FormDialog<ComboFormInput>
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Nuevo combo' : 'Editar combo'}
      fields={fields}
      schema={comboFormSchema}
      defaultValues={mode === 'create' ? { name: '', salePrice: 0 } : undefined}
      values={editValues}
      onSubmit={onSubmit}
      isPending={isPending}
      submitLabel={mode === 'create' ? 'Crear' : 'Guardar cambios'}
    />
  )
}
