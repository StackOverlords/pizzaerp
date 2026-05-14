import type { IOrderRepository } from '../../domain/repositories/i-order-repository'
import type { IOrderCancellationRepository } from '../../domain/repositories/i-order-cancellation-repository'
import type { IUserRepository } from '../../domain/repositories/i-user-repository'
import type { Order } from '../../domain/entities/order'
import type { OrderCancellation } from '../../domain/entities/order-cancellation'
import { OrderStatus } from '../../domain/entities/order'
import { Errors } from '../../shared/errors/app-error'
import { bcryptService } from '../../infrastructure/auth/bcrypt.service'
import { pinRateLimiter } from '../../shared/services/pin-rate-limiter'

interface Dependencies {
  orderRepository: IOrderRepository
  cancellationRepository: IOrderCancellationRepository
  userRepository: IUserRepository
}

export interface CancelOrderInput {
  orderId: string
  cajeroUserId: string
  tenantId: string
  adminPin?: string
  reason?: string
  requirePin: boolean
}

export interface CancelOrderResult {
  order: Order
  cancellation: OrderCancellation
}

export function createCancelOrderUseCase({ orderRepository, cancellationRepository, userRepository }: Dependencies) {
  return async function cancelOrder(input: CancelOrderInput): Promise<CancelOrderResult> {
    const order = await orderRepository.findById(input.orderId)
    if (!order) throw Errors.notFound(`Order '${input.orderId}' not found`)

    if (order.status !== OrderStatus.PENDING) {
      throw Errors.conflict(`El pedido ya está en estado ${order.status} y no puede cancelarse`)
    }

    let adminUserId = input.cajeroUserId

    if (input.requirePin) {
      if (!input.adminPin) throw Errors.badRequest('PIN de administrador requerido')

      if (pinRateLimiter.isBlocked(input.tenantId, 'cancel')) {
        const secs = pinRateLimiter.remainingSeconds(input.tenantId, 'cancel')
        throw Errors.forbidden(`PIN bloqueado por intentos fallidos. Intente en ${secs} segundos`)
      }

      const admins = await userRepository.findAdminsWithPin(input.tenantId)
      if (admins.length === 0) throw Errors.badRequest('No hay administradores con PIN configurado')

      let matched: (typeof admins)[number] | undefined
      for (const admin of admins) {
        if (await bcryptService.compare(input.adminPin, admin.pinHash!)) {
          matched = admin
          break
        }
      }

      if (!matched) {
        pinRateLimiter.recordFailure(input.tenantId, 'cancel')
        throw Errors.unauthorized('PIN incorrecto')
      }

      pinRateLimiter.reset(input.tenantId, 'cancel')
      adminUserId = matched.id
    }

    const cancelledOrder = await orderRepository.cancel(input.orderId)
    const cancellation = await cancellationRepository.create({
      orderId: input.orderId,
      adminUserId,
      cajeroUserId: input.cajeroUserId,
      reason: input.reason,
    })

    return { order: cancelledOrder, cancellation }
  }
}
