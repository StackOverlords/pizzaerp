import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/core/auth/store'
import { SupplyTransferTable } from '@/features/supply/components/SupplyTransferTable'
import { CreateTransferDialog } from '@/features/supply/components/CreateTransferDialog'
import { ReceiveTransferDialog } from '@/features/supply/components/ReceiveTransferDialog'
import type { SupplyTransfer } from '@/features/supply/schemas'

export default function SupplyTransfersPage() {
  const isAdmin = useAuthStore((s) => s.hasRole('ADMIN'))

  const [createOpen, setCreateOpen]           = useState(false)
  const [receiveOpen, setReceiveOpen]         = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<SupplyTransfer | null>(null)

  function handleReceive(transfer: SupplyTransfer) {
    setSelectedTransfer(transfer)
    setReceiveOpen(true)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Transferencias de insumos</h1>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} size="sm">
            Registrar envío
          </Button>
        )}
      </div>

      <SupplyTransferTable onReceive={handleReceive} />

      <CreateTransferDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ReceiveTransferDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        transfer={selectedTransfer}
      />
    </div>
  )
}
