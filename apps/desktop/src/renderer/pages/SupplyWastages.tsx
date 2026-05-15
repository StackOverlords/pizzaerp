import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { eventBus } from '@/core/events/event-bus'
import { SupplyWastageTable } from '@/features/supply/components/SupplyWastageTable'
import { LogWastageDialog } from '@/features/supply/components/LogWastageDialog'

export default function SupplyWastagesPage() {
  const [logOpen, setLogOpen] = useState(false)

  useEffect(() => {
    const unsub = eventBus.on('supply.wastageDialog.requested', () => {
      setLogOpen(true)
    })
    return unsub
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Mermas</h1>
        <Button onClick={() => setLogOpen(true)} size="sm">
          Registrar merma
        </Button>
      </div>

      <SupplyWastageTable />

      <LogWastageDialog open={logOpen} onOpenChange={setLogOpen} />
    </div>
  )
}
