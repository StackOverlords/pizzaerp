import { useState, useEffect } from 'react'
import { OrderListTable } from '@/features/orders/components/OrderListTable'
import { OrderDetailSheet } from '@/features/orders/components/OrderDetailSheet'
import { PayOrderDialog } from '@/features/orders/components/PayOrderDialog'
import { CancelOrderDialog } from '@/features/orders/components/CancelOrderDialog'
import { ApplyDiscountDialog } from '@/features/orders/components/ApplyDiscountDialog'
import { eventBus } from '@/core/events/event-bus'
import { useOrder } from '@/features/orders/api'

function useSelectedOrderSubtotal(orderId: string | null): number | undefined {
  const { data: order } = useOrder(orderId)
  return order?.subtotal
}

export default function OrdersListPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [payOrderId, setPayOrderId] = useState<string | null>(null)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [discountOrderId, setDiscountOrderId] = useState<string | null>(null)

  const discountSubtotal = useSelectedOrderSubtotal(discountOrderId)

  useEffect(() => {
    const unsubDetail = eventBus.on('order.detailSheet.requested', ({ orderId }) => {
      setSelectedOrderId(orderId)
    })
    const unsubPay = eventBus.on('order.payDialog.requested', ({ orderId }) => {
      setPayOrderId(orderId)
    })
    const unsubCancel = eventBus.on('order.cancelDialog.requested', ({ orderId }) => {
      setCancelOrderId(orderId)
    })
    const unsubDiscount = eventBus.on('order.discountDialog.requested', ({ orderId }) => {
      setDiscountOrderId(orderId)
    })

    return () => {
      unsubDetail()
      unsubPay()
      unsubCancel()
      unsubDiscount()
    }
  }, [])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">Órdenes</h1>
      <OrderListTable />

      <OrderDetailSheet
        orderId={selectedOrderId}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null)
        }}
      />

      <PayOrderDialog
        orderId={payOrderId}
        onOpenChange={(open) => {
          if (!open) setPayOrderId(null)
        }}
      />

      <CancelOrderDialog
        orderId={cancelOrderId}
        onOpenChange={(open) => {
          if (!open) setCancelOrderId(null)
        }}
      />

      <ApplyDiscountDialog
        orderId={discountOrderId}
        currentSubtotal={discountSubtotal}
        onOpenChange={(open) => {
          if (!open) setDiscountOrderId(null)
        }}
      />
    </div>
  )
}
