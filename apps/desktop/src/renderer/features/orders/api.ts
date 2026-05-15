import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/http/client'
import { queryKeys } from '@/core/http/query-keys'
import { useAuthStore } from '@/core/auth/store'
import { eventBus } from '@/core/events/event-bus'
import { getEffectiveBranchId } from '@/features/branch-context/selectors'
import {
  orderWithItemsSchema,
  orderListPageSchema,
  dishSchema,
  payOrderResponseSchema,
  cancelOrderResponseSchema,
  applyDiscountResponseSchema,
  type OrderFilters,
  type OrderListPage,
  type OrderWithItems,
  type Dish,
  type CreateOrderInput,
  type PayOrderInput,
  type CancelOrderInput,
  type ApplyDiscountInput,
  type PayOrderResponse,
  type CancelOrderResponse,
  type ApplyDiscountResponse,
} from './schemas'
import { z } from 'zod'

export { useStaffOptions } from '@/features/shifts/api'
export { useDishIngredients } from '@/features/menu/api'

export function useOrders(filters: OrderFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<OrderListPage>({
    queryKey: queryKeys.orders.list(filters),
    queryFn: async () => {
      const { data } = await api.get<unknown>('/api/v1/orders', { params: filters })
      return orderListPageSchema.parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 15_000,
  })
}

export function useOrder(id: string | null | undefined) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<OrderWithItems>({
    queryKey: queryKeys.orders.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<unknown>(`/api/v1/orders/${id}`)
      return orderWithItemsSchema.parse(data)
    },
    enabled: !!id && isAuthenticated,
    staleTime: 10_000,
  })
}

export function useDishes(opts?: { activeOnly?: boolean }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const activeOnly = opts?.activeOnly ?? true
  return useQuery<Dish[]>({
    queryKey: queryKeys.menu.dishes(opts),
    queryFn: async () => {
      const { data } = await api.get<unknown>('/api/v1/dishes', {
        params: activeOnly ? { activeOnly: 'true' } : undefined,
      })
      return z.array(dishSchema).parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation<OrderWithItems, unknown, CreateOrderInput>({
    mutationFn: async (input) => {
      const user = useAuthStore.getState().user
      const payload =
        user?.role === 'ADMIN' && user.branchId === null
          ? { ...input, branchId: getEffectiveBranchId() ?? undefined }
          : input
      const { data } = await api.post<unknown>('/api/v1/orders', payload)
      return orderWithItemsSchema.parse(data)
    },
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
      eventBus.emit('order.created', { orderId: order.id, orderNumber: order.orderNumber })
    },
  })
}

export function usePayOrder() {
  const queryClient = useQueryClient()
  return useMutation<PayOrderResponse, unknown, { id: string; input: PayOrderInput }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.patch<unknown>(`/api/v1/orders/${id}/pay`, input)
      return payOrderResponseSchema.parse(data)
    },
    onSuccess: async (_response, { id }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
      eventBus.emit('order.status.changed', { orderId: id, status: 'PAID' })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation<CancelOrderResponse, unknown, { id: string; input: CancelOrderInput }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.patch<unknown>(`/api/v1/orders/${id}/cancel`, input)
      return cancelOrderResponseSchema.parse(data)
    },
    onSuccess: async (_response, { id }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
      eventBus.emit('order.status.changed', { orderId: id, status: 'CANCELLED' })
    },
  })
}

export function useApplyDiscount() {
  const queryClient = useQueryClient()
  return useMutation<ApplyDiscountResponse, unknown, { id: string; input: ApplyDiscountInput }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.patch<unknown>(`/api/v1/orders/${id}/discount`, input)
      return applyDiscountResponseSchema.parse(data)
    },
    onSuccess: async (_response, { id }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
      eventBus.emit('order.status.changed', { orderId: id, status: 'PENDING' })
    },
  })
}

// Re-export OrderHeader for consumers
export type { OrderHeader } from './schemas'
