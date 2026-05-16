import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import { useCombos } from '../api'
import type { OrderItemInput } from '../schemas'
import { ComboCustomizerDialog } from './ComboCustomizerDialog'

export type ComboAddPayload = {
  comboId: string
  comboName: string
  unitPrice: number
  input: OrderItemInput
  selectionLabels: Array<{ slotId: string; slotName: string; dishId: string; dishName: string }>
}

interface ComboPickerProps {
  onAdd: (payload: ComboAddPayload) => void
  disabled?: boolean
}

export function ComboPicker({ onAdd, disabled }: ComboPickerProps) {
  const { data: combos = [], isLoading } = useCombos()
  const [selectedComboId, setSelectedComboId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[1, 2].map((n) => (
          <div key={n} className="h-24 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (combos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No hay combos activos disponibles
      </p>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {combos.map((combo) => (
          <Card key={combo.id} className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="p-3 flex flex-col gap-2">
              <p className="text-sm font-medium leading-tight">{combo.name}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(combo.salePrice)}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={disabled}
                onClick={() => setSelectedComboId(combo.id)}
              >
                Personalizar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <ComboCustomizerDialog
        comboId={selectedComboId}
        open={!!selectedComboId}
        onOpenChange={(open) => { if (!open) setSelectedComboId(null) }}
        onConfirm={(payload) => {
          onAdd(payload)
          setSelectedComboId(null)
        }}
      />
    </>
  )
}
