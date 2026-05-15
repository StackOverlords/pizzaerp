import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/core/auth/store'
import { SupplyClosingTable } from '@/features/supply/components/SupplyClosingTable'
import { CloseSupplyDayDialog } from '@/features/supply/components/CloseSupplyDayDialog'

export default function SupplyClosingsPage() {
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))
  const [closeOpen, setCloseOpen] = useState(false)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Cierre diario de insumos</h1>
        {isAdmin && (
          <Button onClick={() => setCloseOpen(true)} size="sm">
            Cerrar día
          </Button>
        )}
      </div>

      <SupplyClosingTable />

      <CloseSupplyDayDialog open={closeOpen} onOpenChange={setCloseOpen} />
    </div>
  )
}
