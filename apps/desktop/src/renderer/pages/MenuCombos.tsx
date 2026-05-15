import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { eventBus } from '@/core/events/event-bus'
import { useAuthStore } from '@/core/auth/store'
import { confirm } from '@/core/confirm'
import { notify } from '@/core/notify'
import { extractApiMessage } from '@/core/http/error'
import { ComboTable } from '@/features/menu/components/ComboTable'
import { ComboFormDialog } from '@/features/menu/components/ComboFormDialog'
import { ComboSlotSheet } from '@/features/menu/components/ComboSlotSheet'
import { useDeactivateCombo } from '@/features/menu/api'
import type { Combo } from '@/features/menu/schemas'

export default function MenuCombosPage() {
  const isAdmin          = useAuthStore((s) => s.hasRole('ADMIN'))
  const deactivateMutation = useDeactivateCombo()

  const [formOpen, setFormOpen]       = useState(false)
  const [formMode, setFormMode]       = useState<'create' | 'edit'>('create')
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null)
  const [slotSheetOpen, setSlotSheetOpen] = useState(false)
  const [slotCombo, setSlotCombo]     = useState<Combo | null>(null)

  useEffect(() => {
    return eventBus.on('menu.comboDialog.requested', ({ mode }) => {
      setFormMode(mode)
      setSelectedCombo(null)
      setFormOpen(true)
    })
  }, [])

  function handleEdit(combo: Combo) {
    setSelectedCombo(combo)
    setFormMode('edit')
    setFormOpen(true)
  }

  function handleManageSlots(combo: Combo) {
    setSlotCombo(combo)
    setSlotSheetOpen(true)
  }

  async function handleDeactivate(combo: Combo) {
    const ok = await confirm({
      title: 'Desactivar combo',
      description: `¿Desactivar "${combo.name}"? Ya no estará disponible para nuevas órdenes.`,
      confirmLabel: 'Desactivar',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await deactivateMutation.mutateAsync(combo.id)
      notify('Combo desactivado correctamente', { type: 'success' })
    } catch (err) {
      notify(extractApiMessage(err), { type: 'error' })
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Combos</h1>
        {isAdmin && (
          <Button onClick={() => { setSelectedCombo(null); setFormMode('create'); setFormOpen(true) }} size="sm">
            Nuevo combo
          </Button>
        )}
      </div>

      <ComboTable
        onEdit={handleEdit}
        onManageSlots={handleManageSlots}
        onDeactivate={handleDeactivate}
      />

      <ComboFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        combo={selectedCombo}
      />

      <ComboSlotSheet
        open={slotSheetOpen}
        onOpenChange={setSlotSheetOpen}
        comboId={slotCombo?.id ?? null}
        comboName={slotCombo?.name ?? ''}
      />
    </div>
  )
}
