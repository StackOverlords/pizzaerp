import { Errors } from '../../shared/errors/app-error'
import type { IOrderRepository, ListOrdersFilters, OrderListResult } from '../../domain/repositories/i-order-repository'
import type { OrderStatus } from '../../domain/entities/order'

export interface ListOrdersInput {
  branchId?: string
  shiftId?: string
  status?: OrderStatus
  userId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'orderNumber' | 'total'
  sortOrder?: 'asc' | 'desc'
}

interface Dependencies {
  orderRepository: IOrderRepository
}

const VALID_SORT_BY = ['createdAt', 'orderNumber', 'total'] as const
const VALID_SORT_ORDER = ['asc', 'desc'] as const

export function createListOrdersUseCase({ orderRepository }: Dependencies) {
  return async function listOrders(input: ListOrdersInput): Promise<OrderListResult> {
    const page  = input.page  ?? 1
    const limit = input.limit ?? 20

    if (page < 1)   throw Errors.badRequest('El parámetro "page" debe ser mayor o igual a 1')
    if (limit < 1)  throw Errors.badRequest('El parámetro "limit" debe ser mayor o igual a 1')
    if (limit > 100) throw Errors.badRequest('El parámetro "limit" no puede superar 100')
    const sortBy    = (input.sortBy    ?? 'createdAt') as 'createdAt' | 'orderNumber' | 'total'
    const sortOrder = (input.sortOrder ?? 'desc')      as 'asc' | 'desc'

    if (!VALID_SORT_BY.includes(sortBy))
      throw Errors.badRequest(`sortBy inválido: ${sortBy}`)
    if (!VALID_SORT_ORDER.includes(sortOrder))
      throw Errors.badRequest(`sortOrder inválido: ${sortOrder}`)
    if (input.from && input.to && input.from > input.to)
      throw Errors.badRequest('El rango de fechas es inválido: "from" debe ser anterior o igual a "to"')

    const filters: ListOrdersFilters = {
      branchId: input.branchId,
      shiftId: input.shiftId,
      status: input.status,
      userId: input.userId,
      from: input.from,
      to: input.to,
      page,
      limit,
      sortBy,
      sortOrder,
    }
    return orderRepository.findMany(filters)
  }
}
