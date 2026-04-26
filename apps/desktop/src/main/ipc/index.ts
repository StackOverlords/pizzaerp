import { BrowserWindow } from 'electron'
import { registerWindowHandlers } from './window'
import { registerThemeHandlers } from './theme'
import { registerStorageHandlers } from './storage'

export function registerAllHandlers(win: BrowserWindow) {
  registerWindowHandlers(win)
  registerThemeHandlers(win)
  registerStorageHandlers()
}
