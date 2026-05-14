import { CreateOrderForm } from '@/features/orders/components/CreateOrderForm'

export default function OrdersNewPage() {
  return (
    <div className="p-4 max-w-lg">
      <h1 className="text-lg font-semibold mb-4">Nueva orden</h1>
      <CreateOrderForm />
    </div>
  )
}
