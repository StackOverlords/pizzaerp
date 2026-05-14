import type { IOrderRepository } from '../../domain/repositories/i-order-repository'
import type { IOrderDiscountRepository } from '../../domain/repositories/i-order-discount-repository'
import type { IUserRepository } from '../../domain/repositories/i-user-repository'
import type { Order } from '../../domain/entities/order'
import type { OrderDiscount, DiscountType } from '../../domain/entities/order-discount'
import { OrderStatus } from '../../domain/entities/order'
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
  cajeroUserId: string
  adminPin?: string
  type: DiscountType
  value: number
  reason?: string
  requirePin: boolean
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
      throw Errors.badRequest('Discount value must be greater than 0')
    }

    let adminUserId = input.cajeroUserId

    if (input.requirePin) {
      if (!input.adminPin) throw Errors.badRequest('PIN de administrador requerido')

      if (pinRateLimiter.isBlocked(input.tenantId, 'discount')) {
        const secs = pinRateLimiter.remainingSeconds(input.tenantId, 'discount')
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
        pinRateLimiter.recordFailure(input.tenantId, 'discount')
        throw Errors.unauthorized('PIN incorrecto')
      }

      pinRateLimiter.reset(input.tenantId, 'discount')
      adminUserId = matched.id
    }

    let amount: number
    if (input.type === 'PERCENTAGE') {
      if (input.value > 100) throw Errors.badRequest('Percentage cannot exceed 100%')
      amount = parseFloat((order.subtotal * input.value / 100).toFixed(2))
    } else {
      amount = input.value
    }

    if (order.total - amount < 0) {
      throw Errors.badRequest('Discount cannot exceed order total')
    }

    const updatedOrder = await orderRepository.applyDiscount(input.orderId, amount)
    const discount = await discountRepository.create({
      orderId: input.orderId,
      adminUserId,
      type: input.type,
      value: input.value,
      amount,
      reason: input.reason,
    })

    return { order: updatedOrder, discount }
  }
}
