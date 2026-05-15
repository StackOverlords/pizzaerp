import { FormDialog, defineFields, FORM_NONE } from '@/components/schema-form'
import { notify } from '@/core/notify'
import { useSupplyTypes, useLogSupplyWastage } from '../api'
import {
  logWastageFormSchema,
  WASTAGE_REASON,
  WASTAGE_REASON_LABELS,
  type LogWastageFormInput,
} from '../schemas'

interface LogWastageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogWastageDialog({ open, onOpenChange }: LogWastageDialogProps) {
  const { data: supplyTypes = [], isLoading: loadingTypes } = useSupplyTypes()
  const mutation = useLogSupplyWastage()

  const supplyTypeOptions = supplyTypes
    .filter((st) => st.active)
    .map((st) => ({ label: st.name, value: st.name }))

  const reasonOptions = [
    { label: WASTAGE_REASON_LABELS[WASTAGE_REASON.FELL],         value: WASTAGE_REASON.FELL },
    { label: WASTAGE_REASON_LABELS[WASTAGE_REASON.BAD_SHAPE],    value: WASTAGE_REASON.BAD_SHAPE },
    { label: WASTAGE_REASON_LABELS[WASTAGE_REASON.BURNED],       value: WASTAGE_REASON.BURNED },
    { label: WASTAGE_REASON_LABELS[WASTAGE_REASON.CONTAMINATED], value: WASTAGE_REASON.CONTAMINATED },
    { label: WASTAGE_REASON_LABELS[WASTAGE_REASON.OTHER],        value: WASTAGE_REASON.OTHER },
  ]

  const fields = defineFields<LogWastageFormInput>([
    {
      id: 'supplyType',
      type: 'select',
      label: 'Tipo de insumo',
      required: true,
      options: supplyTypeOptions,
      loading: loadingTypes,
      placeholder: 'Seleccionar...',
    },
    {
      id: 'quantity',
      type: 'number',
      label: 'Cantidad',
      required: true,
      min: 1,
      step: 1,
    },
    {
      id: 'reason',
      type: 'select',
      label: 'Motivo',
      required: true,
      options: reasonOptions,
      placeholder: 'Seleccionar motivo...',
    },
    {
      id: 'notes',
      type: 'textarea',
      label: 'Notas (opcional)',
      rows: 2,
    },
  ])

  async function onSubmit(data: LogWastageFormInput) {
    await mutation.mutateAsync(data)
    notify('Merma registrada correctamente', { type: 'success' })
    onOpenChange(false)
  }

  return (
    <FormDialog<LogWastageFormInput>
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar merma"
      fields={fields}
      schema={logWastageFormSchema}
      defaultValues={{
        supplyType: FORM_NONE,
        quantity:   1,
        reason:     FORM_NONE as LogWastageFormInput['reason'],
        notes:      '',
      }}
      onSubmit={onSubmit}
      isPending={mutation.isPending}
      submitLabel="Registrar"
    />
  )
}
