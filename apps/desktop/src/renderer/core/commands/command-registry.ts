import type { CommandHandler, CommandLabel, CommandEntry, CommandOptions } from './types'

class CommandRegistryClass {
  private handlers = new Map<string, CommandHandler>()
  private labels   = new Map<string, CommandLabel>()
  private options  = new Map<string, CommandOptions>()

  register(id: string, label: CommandLabel, handler: CommandHandler, opts: CommandOptions = {}): void {
    if (this.handlers.has(id)) {
      console.warn(`[CommandRegistry] Command "${id}" is already registered.`)
      return
    }
    this.handlers.set(id, handler)
    this.labels.set(id, label)
    this.options.set(id, opts)
  }

  unregister(id: string): void {
    this.handlers.delete(id)
    this.labels.delete(id)
    this.options.delete(id)
  }

  async execute(id: string): Promise<void> {
    const handler = this.handlers.get(id)
    if (!handler) {
      console.warn(`[CommandRegistry] Command "${id}" not found.`)
      return
    }
    await handler()
  }

  getAll(): CommandEntry[] {
    return Array.from(this.handlers.keys()).map((id) => this._toEntry(id))
  }

  getPaletteCommands(): CommandEntry[] {
    return this.getAll().filter((cmd) => cmd.showInPalette)
  }

  override(id: string, handler: CommandHandler): void {
    if (!this.handlers.has(id)) {
      console.warn(`[CommandRegistry] Cannot override "${id}": not registered.`)
      return
    }
    this.handlers.set(id, handler)
  }

  has(id: string): boolean {
    return this.handlers.has(id)
  }

  private _toEntry(id: string): CommandEntry {
    const opts = this.options.get(id) ?? {}
    return {
      id,
      label: this._resolve(this.labels.get(id) ?? id),
      showInPalette: opts.showInPalette ?? true,
    }
  }

  private _resolve(label: CommandLabel): string {
    return typeof label === 'function' ? label() : label
  }
}

export const commandRegistry = new CommandRegistryClass()
