import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import { eventBus } from '@/core/events/event-bus'
import { useOrder } from '../api'
import { ORDER_STATUS } from '../schemas'

function StatusBadge({ status }: { status: string }) {
  if (status === ORDER_STATUS.PAID) {
    return (
      <Badge
        variant="outline"
        className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
      >
        Cobrado
      </Badge>
    )
  }
  if (status === ORDER_STATUS.CANCELLED) {
    return <Badge variant="destructive">Cancelado</Badge>
  }
  return (
    <Badge
      variant="secondary"
      className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
    >
      Pendiente
    </Badge>
  )
}

interface OrderDetailSheetProps {
  orderId: string | null
  onOpenChange: (open: boolean) => void
}

export function OrderDetailSheet({ orderId, onOpenChange }: OrderDetailSheetProps) {
  const { data: order, isLoading, isError, refetch } = useOrder(orderId)

  return (
    <Sheet open={!!orderId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto flex flex-col gap-4">
        {isLoading && (
          <>
            <SheetHeader>
              <Skeleton className="h-6 w-48" />
            </SheetHeader>
            <div className="space-y-3 px-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-32 w-full" />
            </div>
          </>
        )}

        {isError && (
          <div className="px-4 py-6 space-y-3">
            <p className="text-sm text-destructive">Error al cargar la orden.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        )}

        {!isLoading && !isError && order && (
          <>
            <SheetHeader className="pb-2">
              <div className="flex items-center gap-2">
                <SheetTitle>Orden #{order.orderNumber}</SheetTitle>
                <StatusBadge status={order.status} />
              </div>
            </SheetHeader>

            {/* Metadata grid */}
            <div className="px-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">Fecha</span>
              <span>{order.createdAt.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-muted-foreground">Cajero (ID)</span>
              <span className="truncate">{order.userId}</span>
              <span className="text-muted-foreground">Turno</span>
              <span className="truncate">{order.shiftId}</span>
            </div>

            {/* Items table */}
            <div className="px-4">
              <p className="text-sm font-medium mb-2">Productos</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">P. unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p>{item.dishName}</p>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground">{item.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="px-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-destructive italic">
                  <span>Descuento</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base border-t pt-1 mt-1">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="px-4 text-sm">
                <p className="text-muted-foreground mb-0.5">Notas</p>
                <p>{order.notes}</p>
              </div>
            )}

            {/* Action buttons — status gated (PENDING only) */}
            {order.status === ORDER_STATUS.PENDING && (
              <div className="px-4 pb-4 flex gap-2 mt-auto flex-wrap">
                <Button
                  onClick={() => eventBus.emit('order.payDialog.requested', { orderId: order.id })}
                >
                  Cobrar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => eventBus.emit('order.discountDialog.requested', { orderId: order.id })}
                >
                  Descuento
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => eventBus.emit('order.cancelDialog.requested', { orderId: order.id })}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
