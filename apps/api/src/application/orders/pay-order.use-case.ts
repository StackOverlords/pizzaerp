import type { IOrderRepository } from '../../domain/repositories/i-order-repository'
import type { IPaymentRepository } from '../../domain/repositories/i-payment-repository'
import type { Order } from '../../domain/entities/order'
import type { Payment, PaymentMethod } from '../../domain/entities/payment'
import { OrderStatus } from '../../domain/entities/order'
import { Errors } from '../../shared/errors/app-error'

interface Dependencies {
  orderRepository: IOrderRepository
  paymentRepository: IPaymentRepository
}

export interface PayOrderInput {
  orderId: string
  method: PaymentMethod
  amount: number
  reference?: string
}

export interface PayOrderResult {
  order: Order
  payment: Payment
}

export function createPayOrderUseCase({ orderRepository, paymentRepository }: Dependencies) {
  return async function payOrder(input: PayOrderInput): Promise<PayOrderResult> {
    const orderWithItems = await orderRepository.findById(input.orderId)
    if (!orderWithItems) throw Errors.notFound(`Order '${input.orderId}' not found`)

    if (orderWithItems.status !== OrderStatus.PENDING) {
      throw Errors.conflict(`El pedido ya está en estado ${orderWithItems.status}`)
    }

    let changeAmount: number | undefined
    let paymentAmount: number

    if (input.method === 'CASH') {
      if (input.amount < orderWithItems.total) {
        throw Errors.badRequest(
          `El monto recibido (${input.amount}) es menor al total del pedido (${orderWithItems.total})`,
        )
      }
      paymentAmount = input.amount
      changeAmount = parseFloat((input.amount - orderWithItems.total).toFixed(2))
    } else {
      paymentAmount = orderWithItems.total
    }

    const order = await orderRepository.pay(input.orderId)
    const payment = await paymentRepository.create({
      orderId: input.orderId,
      method: input.method,
      amount: paymentAmount,
      changeAmount,
      reference: input.reference,
    })

    return { order, payment }
  }
}
