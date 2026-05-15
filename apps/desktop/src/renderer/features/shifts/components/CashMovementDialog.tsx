import { FormDialog, defineFields } from '@/components/schema-form'
import { notify } from '@/core/notify'
import { extractApiMessage } from '@/core/http/error'
import { useCreateCashMovement } from '../api'
import {
  CASH_MOVEMENT_TYPE,
  createCashMovementInputSchema,
  type CashMovementType,
  type CreateCashMovementInput,
} from '../schemas'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: CashMovementType
}

export function CashMovementDialog({ open, onOpenChange, type }: Props) {
  const mutation = useCreateCashMovement()

  const fields = defineFields<CreateCashMovementInput>([
    {
      id:       'type',
      type:     'select',
      label:    'Tipo',
      required: true,
      options:  [
        { label: 'Ingreso', value: CASH_MOVEMENT_TYPE.INGRESO },
        { label: 'Retiro',  value: CASH_MOVEMENT_TYPE.RETIRO  },
      ],
    },
    {
      id:        'amount',
      type:      'number',
      label:     'Monto',
      required:  true,
      min:       0,
      step:      0.01,
      autoFocus: true,
    },
    {
      id:        'reason',
      type:      'textarea',
      label:     'Motivo',
      required:  true,
      rows:      3,
      maxLength: 200,
    },
  ])

  async function onSubmit(data: CreateCashMovementInput) {
    try {
      await mutation.mutateAsync(data)
      notify('Movimiento registrado', { type: 'success' })
      onOpenChange(false)
    } catch (err) {
      notify(extractApiMessage(err), { type: 'error' })
    }
  }

  return (
    <FormDialog<CreateCashMovementInput>
      open={open}
      onOpenChange={onOpenChange}
      title={type === CASH_MOVEMENT_TYPE.INGRESO ? 'Registrar ingreso' : 'Registrar retiro'}
      fields={fields}
      schema={createCashMovementInputSchema}
      defaultValues={{ type, amount: 0, reason: '' }}
      onSubmit={onSubmit}
      isPending={mutation.isPending}
      submitLabel="Registrar"
      maxWidth="sm"
    />
  )
}
