import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useCombo, useDishes } from '../api'
import type { ComboAddPayload } from './ComboPicker'
import { ORDER_ITEM_KIND } from '../schemas'

interface ComboCustomizerDialogProps {
  comboId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (payload: ComboAddPayload) => void
}

export function ComboCustomizerDialog({
  comboId,
  open,
  onOpenChange,
  onConfirm,
}: ComboCustomizerDialogProps) {
  const { data: combo, isLoading } = useCombo(comboId)
  const { data: dishes = [] } = useDishes()

  const dishNameMap = new Map(dishes.map((d) => [d.id, d.name]))

  const [selections, setSelections] = useState<Map<string, string>>(new Map())
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  // Reset + auto-select when combo changes
  useEffect(() => {
    if (!combo) {
      setSelections(new Map())
      setQuantity(1)
      setNotes('')
      return
    }
    const initial = new Map<string, string>()
    for (const slot of combo.slots) {
      if (slot.options.length === 1) {
        initial.set(slot.id, slot.options[0].dishId)
      }
    }
    setSelections(initial)
    setQuantity(1)
    setNotes('')
  }, [combo?.id])

  const allRequiredCovered =
    combo?.slots
      .filter((s) => s.required)
      .every((s) => selections.has(s.id)) ?? false

  function handleConfirm() {
    if (!combo) return

    const selectionLabels: ComboAddPayload['selectionLabels'] = []
    const selectionItems: Array<{ comboSlotId: string; dishId: string }> = []

    for (const slot of combo.slots) {
      const dishId = selections.get(slot.id)
      if (!dishId) continue
      selectionItems.push({ comboSlotId: slot.id, dishId })
      selectionLabels.push({
        slotId: slot.id,
        slotName: slot.name,
        dishId,
        dishName: dishNameMap.get(dishId) ?? dishId,
      })
    }

    onConfirm({
      comboId: combo.id,
      comboName: combo.name,
      unitPrice: combo.salePrice,
      input: {
        kind: ORDER_ITEM_KIND.COMBO,
        comboId: combo.id,
        quantity,
        notes: notes || undefined,
        selections: selectionItems,
      },
      selectionLabels,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{combo?.name ?? 'Personalizar combo'}</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className="h-16 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {combo && (
          <div className="space-y-4">
            {combo.slots.map((slot) => (
              <div key={slot.id} className="space-y-2">
                <p className="text-sm font-medium">
                  {slot.name}
                  {slot.required && (
                    <span className="ml-1 text-xs text-muted-foreground">(Requerido)</span>
                  )}
                </p>
                <RadioGroup
                  value={selections.get(slot.id) ?? ''}
                  onValueChange={(dishId) =>
                    setSelections((prev) => new Map(prev).set(slot.id, dishId))
                  }
                  className="space-y-1"
                >
                  {slot.options.map((option) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <RadioGroupItem value={option.dishId} id={`${slot.id}-${option.dishId}`} />
                      <Label htmlFor={`${slot.id}-${option.dishId}`} className="cursor-pointer text-sm font-normal">
                        {dishNameMap.get(option.dishId) ?? option.dishId}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Cantidad</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="h-8 text-sm w-24"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notas (opcional)</label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instrucciones especiales..."
                className="text-sm"
              />
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={!allRequiredCovered}
              onClick={handleConfirm}
            >
              Agregar a la orden
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
