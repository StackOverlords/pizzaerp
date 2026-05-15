import { useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormDialog, defineFields } from '@/components/schema-form'
import { notify } from '@/core/notify'
import { confirm } from '@/core/confirm'
import { extractApiMessage } from '@/core/http/error'
import {
  useCombo,
  useAddComboSlot,
  useUpdateComboSlot,
  useRemoveComboSlot,
  useAddSlotOption,
  useRemoveSlotOption,
  useMenuDishes,
} from '../api'
import { slotFormSchema, type ComboSlot, type SlotFormInput } from '../schemas'

interface ComboSlotSheetProps {
  open:        boolean
  onOpenChange:(open: boolean) => void
  comboId:     string | null
  comboName:   string
}

export function ComboSlotSheet({ open, onOpenChange, comboId, comboName }: ComboSlotSheetProps) {
  const { data: combo, isLoading } = useCombo(comboId)
  const { data: dishes = [] }      = useMenuDishes({ activeOnly: true })

  const addSlot      = useAddComboSlot()
  const updateSlot   = useUpdateComboSlot()
  const removeSlot   = useRemoveComboSlot()
  const addOption    = useAddSlotOption()
  const removeOption = useRemoveSlotOption()

  const [slotDialogOpen, setSlotDialogOpen] = useState(false)
  const [editingSlot, setEditingSlot]       = useState<ComboSlot | null>(null)

  const dishMap = Object.fromEntries(dishes.map((d) => [d.id, d.name]))

  const slotFields = defineFields<SlotFormInput>([
    { id: 'name',       type: 'text',   label: 'Nombre del slot', required: true, placeholder: 'Ej: Elige tu bebida', autoFocus: true },
    { id: 'orderIndex', type: 'number', label: 'Orden', required: true, min: 0, step: 1, span: 1 },
    { id: 'required',   type: 'switch', label: 'Obligatorio', span: 1 },
  ])

  async function handleSlotSubmit(data: SlotFormInput) {
    const id = comboId
    if (!id) return
    try {
      if (editingSlot) {
        await updateSlot.mutateAsync({ comboId: id, slotId: editingSlot.id, input: data })
        notify('Slot actualizado', { type: 'success' })
      } else {
        await addSlot.mutateAsync({ comboId: id, input: data })
        notify('Slot agregado', { type: 'success' })
      }
      setSlotDialogOpen(false)
      setEditingSlot(null)
    } catch (err) {
      notify(extractApiMessage(err), { type: 'error' })
    }
  }

  async function handleRemoveSlot(slot: ComboSlot) {
    const id = comboId
    const ok = await confirm({
      title: 'Eliminar slot',
      description: `¿Eliminar el slot "${slot.name}" y todas sus opciones?`,
      confirmLabel: 'Eliminar',
      variant: 'destructive',
    })
    if (!ok || !id) return
    try {
      await removeSlot.mutateAsync({ comboId: id, slotId: slot.id })
      notify('Slot eliminado', { type: 'success' })
    } catch (err) {
      notify(extractApiMessage(err), { type: 'error' })
    }
  }

  async function handleAddOption(slotId: string, dishId: string) {
    const id = comboId
    if (!id) return
    try {
      await addOption.mutateAsync({ comboId: id, slotId, dishId })
    } catch (err) {
      notify(extractApiMessage(err), { type: 'error' })
    }
  }

  async function handleRemoveOption(slotId: string, dishId: string) {
    const id = comboId
    if (!id) return
    try {
      await removeOption.mutateAsync({ comboId: id, slotId, dishId })
    } catch (err) {
      notify(extractApiMessage(err), { type: 'error' })
    }
  }

  function openAddSlot() {
    setEditingSlot(null)
    setSlotDialogOpen(true)
  }

  function openEditSlot(slot: ComboSlot) {
    setEditingSlot(slot)
    setSlotDialogOpen(true)
  }

  const sortedSlots = [...(combo?.slots ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Slots — {comboName}</SheetTitle>
          </SheetHeader>

          {isLoading && (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          )}

          {!isLoading && sortedSlots.length === 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              Este combo no tiene slots. Agregá uno para definir las opciones que el cliente puede elegir.
            </p>
          )}

          <div className="space-y-4">
            {sortedSlots.map((slot, idx) => {
              const addedDishIds = new Set(slot.options.map((o) => o.dishId))
              const availableDishes = dishes.filter((d) => !addedDishIds.has(d.id))

              return (
                <div key={slot.id} className="border rounded-lg p-4 space-y-3">
                  {/* Slot header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-5 shrink-0">#{idx + 1}</span>
                      <span className="font-medium truncate">{slot.name}</span>
                      <Badge variant={slot.required ? 'default' : 'secondary'} className="shrink-0 text-xs">
                        {slot.required ? 'Obligatorio' : 'Opcional'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => openEditSlot(slot)}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveSlot(slot)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>

                  {/* Options list */}
                  {slot.options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {slot.options.map((opt) => (
                        <Badge
                          key={opt.id}
                          variant="outline"
                          className="gap-1 pr-1 cursor-default"
                        >
                          <span className="text-xs">{dishMap[opt.dishId] ?? opt.dishId}</span>
                          <button
                            type="button"
                            className="ml-0.5 rounded-full hover:bg-destructive hover:text-destructive-foreground p-0.5"
                            onClick={() => handleRemoveOption(slot.id, opt.dishId)}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Add dish to slot */}
                  {availableDishes.length > 0 && (
                    <Select
                      value=""
                      onValueChange={(dishId) => { if (dishId) handleAddOption(slot.id, dishId) }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="+ Agregar platillo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDishes.map((d) => (
                          <SelectItem key={d.id} value={d.id} className="text-xs">
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {availableDishes.length === 0 && slot.options.length > 0 && (
                    <p className="text-xs text-muted-foreground">Todos los platillos activos ya están agregados.</p>
                  )}
                </div>
              )
            })}
          </div>

          {!isLoading && (
            <>
              {sortedSlots.length > 0 && <Separator className="my-4" />}
              <Button variant="outline" size="sm" onClick={openAddSlot} className="w-full">
                <Plus size={14} className="mr-1.5" />
                Agregar slot
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>

      <FormDialog<SlotFormInput>
        open={slotDialogOpen}
        onOpenChange={(o) => { setSlotDialogOpen(o); if (!o) setEditingSlot(null) }}
        title={editingSlot ? 'Editar slot' : 'Nuevo slot'}
        fields={slotFields}
        schema={slotFormSchema}
        defaultValues={editingSlot ? undefined : { name: '', required: true, orderIndex: sortedSlots.length }}
        values={editingSlot ? { name: editingSlot.name, required: editingSlot.required, orderIndex: editingSlot.orderIndex } : undefined}
        onSubmit={handleSlotSubmit}
        isPending={addSlot.isPending || updateSlot.isPending}
        submitLabel={editingSlot ? 'Guardar' : 'Agregar'}
      />
    </>
  )
}
