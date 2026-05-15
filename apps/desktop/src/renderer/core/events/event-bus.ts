type EventMap = Record<string, unknown>

type Handler<T> = (payload: T) => void

class EventBusClass<Events extends EventMap> {
  private listeners = new Map<keyof Events, Set<Handler<unknown>>>()

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(handler as Handler<unknown>)
    return () => this.off(event, handler)
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    this.listeners.get(event)?.delete(handler as Handler<unknown>)
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(payload)
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${String(event)}"`, err)
      }
    })
  }

  once<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    const unsub = this.on(event, (payload) => {
      handler(payload)
      unsub()
    })
  }
}

// ── App event catalog ─────────────────────────────────────────────────────────
// Agregar eventos aquí a medida que se crean features.
// Formato: '{feature}.{sustantivo}.{verbo-pasado}'

export type AppEvents = {
  // Auth
  'auth.session.started':      { userId: string }
  'auth.session.ended':        undefined

  // Titlebar (para sincronizar estado del menú entre ventanas)
  'titlebar.menubar.toggled':  { visible: boolean }
  'titlebar.tabbar.toggled':   { visible: boolean }

  // Órdenes
  'order.created':                  { orderId: string; orderNumber: number }
  'order.status.changed':           { orderId: string; status: string }
  'order.detailSheet.requested':    { orderId: string }
  'order.payDialog.requested':      { orderId: string }
  'order.cancelDialog.requested':   { orderId: string }
  'order.discountDialog.requested': { orderId: string }

  // Turnos
  'shifts.openDialog.requested':      undefined
  'shifts.closeDialog.requested':     undefined
  'shifts.movementDialog.requested':  { type: 'INGRESO' | 'RETIRO' }

  // Menú — platos
  'menu.dish.created':    { dishId: string; name: string }
  'menu.dish.updated':    { dishId: string }
  'menu.dish.deactivated': { dishId: string }
  'menu.dish.cloned':     { dishId: string; name: string }

  // Menú — categorías
  'menu.category.created':    { categoryId: string; name: string }
  'menu.category.updated':    { categoryId: string }
  'menu.category.deactivated': { categoryId: string }

  // Menú — diálogos (desde comandos)
  'menu.dishDialog.requested':     { mode: 'create' | 'edit'; dishId?: string }
  'menu.categoryDialog.requested': { mode: 'create' | 'edit'; categoryId?: string }

  // Staff — usuarios
  'staff.user.created': { userId: string; username: string }
  'staff.user.updated': { userId: string }
  'staff.user.deleted': { userId: string }

  // Staff — sucursales
  'staff.branch.created': { branchId: string; name: string }
  'staff.branch.updated': { branchId: string }
  'staff.branch.deleted': { branchId: string }

  // Menú — ingredientes
  'menu.ingredient.created':    { ingredientId: string; name: string }
  'menu.ingredient.updated':    { ingredientId: string }
  'menu.ingredient.deactivated': { ingredientId: string }

  // Menú — diálogos ingredientes (desde comandos)
  'menu.ingredientDialog.requested': { mode: 'create' | 'edit'; ingredientId?: string }

  // Menú — combos
  'menu.combo.created':    { comboId: string; name: string }
  'menu.combo.updated':    { comboId: string }
  'menu.combo.deactivated': { comboId: string }

  // Menú — diálogos combos (desde comandos)
  'menu.comboDialog.requested': { mode: 'create' | 'edit'; comboId?: string }

  // Staff — diálogos (desde comandos)
  'staff.userDialog.requested':   { mode: 'create' | 'edit'; userId?: string }
  'staff.branchDialog.requested': { mode: 'create' | 'edit'; branchId?: string }

  // Branch context (selector ADMIN)
  'branchContext.branch.selected':      { branchId: string; name: string }
  'branchContext.branch.cleared':       { reason: 'user' | 'stale' }
  'branchContext.selector.focusRequested': undefined

  // Supply — tipos de insumo
  'supply.type.created':      { id: string; name: string }
  'supply.type.updated':      { id: string }
  'supply.type.deactivated':  { id: string }

  // Supply — transferencias
  'supply.transfer.created':  { id: string }
  'supply.transfer.received': { id: string }

  // Supply — mermas
  'supply.wastage.logged':    { id: string }

  // Supply — cierre diario
  'supply.closing.done':      { id: string }

  // Supply — diálogos (desde comandos)
  'supply.wastageDialog.requested': undefined

  // Menú — ingredientes de plato
  'menu.dishIngredient.added':   { dishId: string; ingredientId: string }
  'menu.dishIngredient.updated': { dishId: string; ingredientId: string }
  'menu.dishIngredient.removed': { dishId: string; ingredientId: string }
}

export const eventBus = new EventBusClass<AppEvents>()
