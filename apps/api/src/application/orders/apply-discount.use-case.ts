import type { IOrderRepository } from '../../domain/repositories/i-order-repository'
import type { IOrderDiscountRepository } from '../../domain/repositories/i-order-discount-repository'
import type { IUserRepository } from '../../domain/repositories/i-user-repository'
import type { Order } from '../../domain/entities/order'
import type { OrderDiscount, DiscountType } from '../../domain/entities/order-discount'
import { OrderStatus } from '../../domain/entities/order'
import { UserRole } from '../../domain/entities/user'
import { Errors } from '../../shared/errors/app-error'
import { bcryptService } from '../../infrastructure/auth/bcrypt.service'
import { pinRateLimiter } from '../../shared/services/pin-rate-limiter'

interface Dependencies {
  orderRepository: IOrderRepository
  discountRepository: IOrderDiscountRepository
  userRepository: IUserRepository
}

export interface ApplyDiscountInput {
  orderId: string
  tenantId: string
  adminUsername: string
  adminPin: string
  type: DiscountType
  value: number
  reason?: string
}

export interface ApplyDiscountResult {
  order: Order
  discount: OrderDiscount
}

export function createApplyDiscountUseCase({ orderRepository, discountRepository, userRepository }: Dependencies) {
  return async function applyDiscount(input: ApplyDiscountInput): Promise<ApplyDiscountResult> {
    const order = await orderRepository.findById(input.orderId)
    if (!order) throw Errors.notFound(`Order '${input.orderId}' not found`)

    if (order.status !== OrderStatus.PENDING) {
      throw Errors.conflict(`No se puede descontar un pedido en estado ${order.status}`)
    }

    if (input.value <= 0) {
      throw Errors.badRequest('El valor del descuento debe ser mayor a 0')
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

    let amount: number
    if (input.type === 'PERCENTAGE') {
      if (input.value > 100) throw Errors.badRequest('El porcentaje no puede superar el 100%')
      amount = parseFloat((order.subtotal * input.value / 100).toFixed(2))
    } else {
      amount = input.value
    }

    if (order.total - amount < 0) {
      throw Errors.badRequest('El descuento no puede superar el total del pedido')
    }

    const updatedOrder = await orderRepository.applyDiscount(input.orderId, amount)
    const discount = await discountRepository.create({
      orderId: input.orderId,
      adminUserId: admin.id,
      type: input.type,
      value: input.value,
      amount,
      reason: input.reason,
    })

    return { order: updatedOrder, discount }
  }
}
