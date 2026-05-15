import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/core/http/client'
import { queryKeys } from '@/core/http/query-keys'
import { useAuthStore } from '@/core/auth/store'
import { eventBus } from '@/core/events/event-bus'
import {
  dishSchema,
  categorySchema,
  comboSchema,
  comboDetailSchema,
  dishIngredientForOrderSchema,
  ingredientSchema,
  type Dish,
  type Category,
  type Combo,
  type ComboDetail,
  type DishFilters,
  type CategoryFilters,
  type DishApiPayload,
  type CloneDishInput,
  type CategoryFormInput,
  type ComboFormInput,
  type SlotFormInput,
  type DishIngredientForOrder,
  type DishIngredientFormInput,
  type Ingredient,
  type IngredientFilters,
  type IngredientFormInput,
} from './schemas'

// ── Queries ────────────────────────────────────────────────────────────────────

export function useDishIngredients(dishId: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<DishIngredientForOrder[]>({
    queryKey: queryKeys.menu.dishIngredients(dishId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<unknown>(`/api/v1/dishes/${dishId}/ingredients`)
      return z.array(dishIngredientForOrderSchema).parse(data)
    },
    enabled: isAuthenticated && !!dishId,
    staleTime: 60_000,
  })
}

export function useMenuDishes(filters?: DishFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<Dish[]>({
    queryKey: queryKeys.menu.dishes(filters),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters?.activeOnly) params.activeOnly = 'true'
      if (filters?.categoryId) params.categoryId = filters.categoryId
      if (filters?.availableAt) params.availableAt = filters.availableAt
      const { data } = await api.get<unknown>('/api/v1/dishes', { params })
      return z.array(dishSchema).parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

export function useMenuCategories(filters?: CategoryFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<Category[]>({
    queryKey: queryKeys.menu.categories(filters),
    queryFn: async () => {
      const params = filters?.activeOnly ? { activeOnly: 'true' } : undefined
      const { data } = await api.get<unknown>('/api/v1/categories', { params })
      return z.array(categorySchema).parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,   // categories rarely change
  })
}

// ── Dish mutations ─────────────────────────────────────────────────────────────

export function useCreateDish() {
  const qc = useQueryClient()
  return useMutation<Dish, unknown, DishApiPayload>({
    mutationFn: async (input) => {
      const { data } = await api.post<unknown>('/api/v1/dishes', input)
      return dishSchema.parse(data)
    },
    onSuccess: async (dish) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.dishes() })
      eventBus.emit('menu.dish.created', { dishId: dish.id, name: dish.name })
    },
  })
}

export function useUpdateDish() {
  const qc = useQueryClient()
  return useMutation<Dish, unknown, { id: string; input: DishApiPayload }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.put<unknown>(`/api/v1/dishes/${id}`, input)
      return dishSchema.parse(data)
    },
    onSuccess: async (dish) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.dishes() })
      eventBus.emit('menu.dish.updated', { dishId: dish.id })
    },
  })
}

export function useDeactivateDish() {
  const qc = useQueryClient()
  return useMutation<Dish, unknown, string>({
    mutationFn: async (id) => {
      const { data } = await api.patch<unknown>(`/api/v1/dishes/${id}/deactivate`)
      return dishSchema.parse(data)
    },
    onSuccess: async (dish) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.dishes() })
      eventBus.emit('menu.dish.deactivated', { dishId: dish.id })
    },
  })
}

export function useCloneDish() {
  const qc = useQueryClient()
  return useMutation<Dish, unknown, { id: string; input: CloneDishInput }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.post<unknown>(`/api/v1/dishes/${id}/clone`, input)
      return dishSchema.parse(data)
    },
    onSuccess: async (dish) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.dishes() })
      eventBus.emit('menu.dish.cloned', { dishId: dish.id, name: dish.name })
    },
  })
}

// ── Category mutations ─────────────────────────────────────────────────────────

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation<Category, unknown, CategoryFormInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<unknown>('/api/v1/categories', input)
      return categorySchema.parse(data)
    },
    onSuccess: async (cat) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.categories() })
      eventBus.emit('menu.category.created', { categoryId: cat.id, name: cat.name })
    },
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation<Category, unknown, { id: string; input: CategoryFormInput }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.put<unknown>(`/api/v1/categories/${id}`, input)
      return categorySchema.parse(data)
    },
    onSuccess: async (cat) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.categories() })
      eventBus.emit('menu.category.updated', { categoryId: cat.id })
    },
  })
}

export function useDeactivateCategory() {
  const qc = useQueryClient()
  return useMutation<Category, unknown, string>({
    mutationFn: async (id) => {
      const { data } = await api.patch<unknown>(`/api/v1/categories/${id}/deactivate`)
      return categorySchema.parse(data)
    },
    onSuccess: async (cat) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.categories() })
      eventBus.emit('menu.category.deactivated', { categoryId: cat.id })
    },
  })
}

// ── Combo queries ──────────────────────────────────────────────────────────────

export function useCombos(opts?: { activeOnly?: boolean }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<Combo[]>({
    queryKey: queryKeys.menu.combos(opts),
    queryFn: async () => {
      const params = opts?.activeOnly ? { activeOnly: 'true' } : undefined
      const { data } = await api.get<unknown>('/api/v1/combos', { params })
      return z.array(comboSchema).parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

export function useCombo(id: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<ComboDetail>({
    queryKey: queryKeys.menu.combo(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<unknown>(`/api/v1/combos/${id}`)
      return comboDetailSchema.parse(data)
    },
    enabled: isAuthenticated && !!id,
    staleTime: 30_000,
  })
}

// ── Combo mutations ────────────────────────────────────────────────────────────

export function useCreateCombo() {
  const qc = useQueryClient()
  return useMutation<Combo, unknown, ComboFormInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<unknown>('/api/v1/combos', input)
      return comboSchema.parse(data)
    },
    onSuccess: async (combo) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.combos() })
      eventBus.emit('menu.combo.created', { comboId: combo.id, name: combo.name })
    },
  })
}

export function useUpdateCombo() {
  const qc = useQueryClient()
  return useMutation<Combo, unknown, { id: string; input: ComboFormInput }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.put<unknown>(`/api/v1/combos/${id}`, input)
      return comboSchema.parse(data)
    },
    onSuccess: async (combo) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.combos() })
      await qc.invalidateQueries({ queryKey: queryKeys.menu.combo(combo.id) })
      eventBus.emit('menu.combo.updated', { comboId: combo.id })
    },
  })
}

export function useDeactivateCombo() {
  const qc = useQueryClient()
  return useMutation<Combo, unknown, string>({
    mutationFn: async (id) => {
      const { data } = await api.patch<unknown>(`/api/v1/combos/${id}/deactivate`)
      return comboSchema.parse(data)
    },
    onSuccess: async (combo) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.combos() })
      eventBus.emit('menu.combo.deactivated', { comboId: combo.id })
    },
  })
}

// ── Slot mutations ─────────────────────────────────────────────────────────────

export function useAddComboSlot() {
  const qc = useQueryClient()
  return useMutation<unknown, unknown, { comboId: string; input: SlotFormInput }>({
    mutationFn: async ({ comboId, input }) => {
      const { data } = await api.post(`/api/v1/combos/${comboId}/slots`, input)
      return data
    },
    onSuccess: async (_r, { comboId }) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.combo(comboId) })
    },
  })
}

export function useUpdateComboSlot() {
  const qc = useQueryClient()
  return useMutation<unknown, unknown, { comboId: string; slotId: string; input: SlotFormInput }>({
    mutationFn: async ({ comboId, slotId, input }) => {
      const { data } = await api.put(`/api/v1/combos/${comboId}/slots/${slotId}`, input)
      return data
    },
    onSuccess: async (_r, { comboId }) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.combo(comboId) })
    },
  })
}

export function useRemoveComboSlot() {
  const qc = useQueryClient()
  return useMutation<unknown, unknown, { comboId: string; slotId: string }>({
    mutationFn: async ({ comboId, slotId }) => {
      await api.delete(`/api/v1/combos/${comboId}/slots/${slotId}`)
    },
    onSuccess: async (_r, { comboId }) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.combo(comboId) })
    },
  })
}

// ── Slot option mutations ──────────────────────────────────────────────────────

export function useAddSlotOption() {
  const qc = useQueryClient()
  return useMutation<unknown, unknown, { comboId: string; slotId: string; dishId: string }>({
    mutationFn: async ({ comboId, slotId, dishId }) => {
      const { data } = await api.post(`/api/v1/combos/${comboId}/slots/${slotId}/options`, { dishId })
      return data
    },
    onSuccess: async (_r, { comboId }) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.combo(comboId) })
    },
  })
}

export function useRemoveSlotOption() {
  const qc = useQueryClient()
  return useMutation<unknown, unknown, { comboId: string; slotId: string; dishId: string }>({
    mutationFn: async ({ comboId, slotId, dishId }) => {
      await api.delete(`/api/v1/combos/${comboId}/slots/${slotId}/options/${dishId}`)
    },
    onSuccess: async (_r, { comboId }) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.combo(comboId) })
    },
  })
}

// ── DishIngredient mutations ───────────────────────────────────────────────────

export function useAddDishIngredient(dishId: string) {
  const qc = useQueryClient()
  return useMutation<DishIngredientForOrder, unknown, DishIngredientFormInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<unknown>(
        `/api/v1/dishes/${dishId}/ingredients`,
        {
          ingredientId: input.ingredientId,
          baseQuantity: input.baseQuantity,
          behavior:     input.behavior,
          extraCost:    input.behavior === 'EXTRA' ? (input.extraCost ?? 0) : null,
        },
      )
      return dishIngredientForOrderSchema.parse(data)
    },
    onSuccess: async (_r) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.dishIngredients(dishId) })
      eventBus.emit('menu.dishIngredient.added', { dishId, ingredientId: _r.ingredientId })
    },
  })
}

export function useUpdateDishIngredient(dishId: string) {
  const qc = useQueryClient()
  return useMutation<DishIngredientForOrder, unknown, { ingredientId: string; input: DishIngredientFormInput }>({
    mutationFn: async ({ ingredientId, input }) => {
      const { data } = await api.put<unknown>(
        `/api/v1/dishes/${dishId}/ingredients/${ingredientId}`,
        {
          baseQuantity: input.baseQuantity,
          behavior:     input.behavior,
          extraCost:    input.behavior === 'EXTRA' ? (input.extraCost ?? 0) : null,
        },
      )
      return dishIngredientForOrderSchema.parse(data)
    },
    onSuccess: async (_r, { ingredientId }) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.dishIngredients(dishId) })
      eventBus.emit('menu.dishIngredient.updated', { dishId, ingredientId })
    },
  })
}

export function useRemoveDishIngredient(dishId: string) {
  const qc = useQueryClient()
  return useMutation<void, unknown, string>({
    mutationFn: async (ingredientId) => {
      await api.delete(`/api/v1/dishes/${dishId}/ingredients/${ingredientId}`)
    },
    onSuccess: async (_r, ingredientId) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.dishIngredients(dishId) })
      eventBus.emit('menu.dishIngredient.removed', { dishId, ingredientId })
    },
  })
}

// ── Ingredient queries ─────────────────────────────────────────────────────────

export function useIngredients(filters?: IngredientFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<Ingredient[]>({
    queryKey: queryKeys.menu.ingredients(filters),
    queryFn: async () => {
      const params = filters?.activeOnly ? { activeOnly: 'true' } : undefined
      const { data } = await api.get<unknown>('/api/v1/ingredients', { params })
      return z.array(ingredientSchema).parse(data)
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

// ── Ingredient mutations ───────────────────────────────────────────────────────

export function useCreateIngredient() {
  const qc = useQueryClient()
  return useMutation<Ingredient, unknown, IngredientFormInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<unknown>('/api/v1/ingredients', input)
      return ingredientSchema.parse(data)
    },
    onSuccess: async (ingredient) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.ingredients() })
      eventBus.emit('menu.ingredient.created', { ingredientId: ingredient.id, name: ingredient.name })
    },
  })
}

export function useUpdateIngredient() {
  const qc = useQueryClient()
  return useMutation<Ingredient, unknown, { id: string; input: IngredientFormInput }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.put<unknown>(`/api/v1/ingredients/${id}`, input)
      return ingredientSchema.parse(data)
    },
    onSuccess: async (ingredient) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.ingredients() })
      eventBus.emit('menu.ingredient.updated', { ingredientId: ingredient.id })
    },
  })
}

export function useDeactivateIngredient() {
  const qc = useQueryClient()
  return useMutation<Ingredient, unknown, string>({
    mutationFn: async (id) => {
      const { data } = await api.patch<unknown>(`/api/v1/ingredients/${id}/deactivate`)
      return ingredientSchema.parse(data)
    },
    onSuccess: async (ingredient) => {
      await qc.invalidateQueries({ queryKey: queryKeys.menu.ingredients() })
      eventBus.emit('menu.ingredient.deactivated', { ingredientId: ingredient.id })
    },
  })
}
