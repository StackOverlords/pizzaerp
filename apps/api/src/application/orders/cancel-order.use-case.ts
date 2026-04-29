import type { IOrderRepository } from '../../domain/repositories/i-order-repository'
import type { IOrderCancellationRepository } from '../../domain/repositories/i-order-cancellation-repository'
import type { IUserRepository } from '../../domain/repositories/i-user-repository'
import type { Order } from '../../domain/entities/order'
import type { OrderCancellation } from '../../domain/entities/order-cancellation'
import { OrderStatus } from '../../domain/entities/order'
import { UserRole } from '../../domain/entities/user'
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
  adminUsername: string
  adminPin: string
  reason?: string
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

    if (pinRateLimiter.isBlocked(input.tenantId, input.adminUsername)) {
      const secs = pinRateLimiter.remainingSeconds(input.tenantId, input.adminUsername)
      throw Errors.forbidden(`PIN bloqueado por intentos fallidos. Intente en ${secs} segundos`)
    }

    const admin = await userRepository.findByUsername(input.adminUsername, input.tenantId)
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw Errors.badRequest('Administrador no encontrado')
    }

    if (!admin.pinHash) {
      throw Errors.badRequest('El administrador no tiene PIN configurado')
    }

    const valid = await bcryptService.compare(input.adminPin, admin.pinHash)
    if (!valid) {
      pinRateLimiter.recordFailure(input.tenantId, input.adminUsername)
      throw Errors.unauthorized('PIN de administrador incorrecto')
    }

    pinRateLimiter.reset(input.tenantId, input.adminUsername)

    const cancelledOrder = await orderRepository.cancel(input.orderId)
    const cancellation = await cancellationRepository.create({
      orderId: input.orderId,
      adminUserId: admin.id,
      cajeroUserId: input.cajeroUserId,
      reason: input.reason,
    })

    return { order: cancelledOrder, cancellation }
  }
}
