import { CreateOrderForm } from '@/features/orders/components/CreateOrderForm'

export default function OrdersNewPage() {
  return (
    <div className="h-full p-6 flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Nueva orden</h1>
      <CreateOrderForm />
    </div>
  )
}
