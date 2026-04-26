export type CommandHandler  = () => void | Promise<void>
export type CommandLabel    = string | (() => string)

export interface CommandOptions {
  showInPalette?: boolean  // default true
}

export interface CommandEntry {
  id:            string
  label:         string  // siempre resuelto — nunca es función en este punto
  showInPalette: boolean
}
