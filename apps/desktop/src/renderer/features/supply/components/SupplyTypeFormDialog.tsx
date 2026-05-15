import { FormDialog, defineFields } from '@/components/schema-form'
import { notify } from '@/core/notify'
import { useCreateSupplyType, useUpdateSupplyType } from '../api'
import { supplyTypeFormSchema, type SupplyType, type SupplyTypeFormInput } from '../schemas'

interface SupplyTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  supplyType?: SupplyType | null
}

export function SupplyTypeFormDialog({
  open,
  onOpenChange,
  mode,
  supplyType,
}: SupplyTypeFormDialogProps) {
  const createMutation = useCreateSupplyType()
  const updateMutation = useUpdateSupplyType()
  const isPending = createMutation.isPending || updateMutation.isPending

  const fields = defineFields<SupplyTypeFormInput>([
    {
      id: 'name',
      type: 'text',
      label: 'Nombre',
      required: true,
      placeholder: 'Ej: Harina',
      autoFocus: true,
    },
  ])

  async function onSubmit(data: SupplyTypeFormInput) {
    if (mode === 'create') {
      await createMutation.mutateAsync(data)
      notify('Tipo de insumo creado correctamente', { type: 'success' })
    } else {
      if (!supplyType) return
      await updateMutation.mutateAsync({ id: supplyType.id, input: data })
      notify('Tipo de insumo actualizado correctamente', { type: 'success' })
    }
    onOpenChange(false)
  }

  return (
    <FormDialog<SupplyTypeFormInput>
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Nuevo tipo de insumo' : 'Editar tipo de insumo'}
      fields={fields}
      schema={supplyTypeFormSchema}
      values={mode === 'edit' && supplyType ? { name: supplyType.name } : undefined}
      defaultValues={mode === 'create' ? { name: '' } : undefined}
      onSubmit={onSubmit}
      isPending={isPending}
      submitLabel={mode === 'create' ? 'Crear' : 'Guardar cambios'}
    />
  )
}
