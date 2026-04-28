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

  // Órdenes (placeholder — expandir cuando se cree el módulo)
  'order.created':             { orderId: string }
  'order.status.changed':      { orderId: string; status: string }
}

export const eventBus = new EventBusClass<AppEvents>()
