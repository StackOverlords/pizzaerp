import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/core/auth/store'
import { confirm } from '@/core/confirm'
import { notify } from '@/core/notify'
import { extractApiMessage } from '@/core/http/error'
import { SupplyTypeTable } from '@/features/supply/components/SupplyTypeTable'
import { SupplyTypeFormDialog } from '@/features/supply/components/SupplyTypeFormDialog'
import { useDeactivateSupplyType } from '@/features/supply/api'
import type { SupplyType } from '@/features/supply/schemas'

export default function SupplyTypesPage() {
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))
  const deactivateMutation = useDeactivateSupplyType()

  const [formOpen, setFormOpen]     = useState(false)
  const [formMode, setFormMode]     = useState<'create' | 'edit'>('create')
  const [selected, setSelected]     = useState<SupplyType | null>(null)

  function handleNew() {
    setSelected(null)
    setFormMode('create')
    setFormOpen(true)
  }

  function handleEdit(supplyType: SupplyType) {
    setSelected(supplyType)
    setFormMode('edit')
    setFormOpen(true)
  }

  async function handleDeactivate(supplyType: SupplyType) {
    const ok = await confirm({
      title: 'Desactivar tipo de insumo',
      description: `¿Desactivar "${supplyType.name}"? Aparecerá como inactivo en el listado.`,
      confirmLabel: 'Desactivar',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await deactivateMutation.mutateAsync(supplyType.id)
      notify('Tipo de insumo desactivado correctamente', { type: 'success' })
    } catch (err) {
      notify(extractApiMessage(err), { type: 'error' })
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tipos de insumo</h1>
        {isAdmin && (
          <Button onClick={handleNew} size="sm">
            Nuevo tipo
          </Button>
        )}
      </div>

      <SupplyTypeTable onEdit={handleEdit} onDeactivate={handleDeactivate} />

      <SupplyTypeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        supplyType={selected}
      />
    </div>
  )
}
