import { ipcMain, nativeTheme, BrowserWindow } from 'electron'

export function registerThemeHandlers(win: BrowserWindow) {
  ipcMain.handle('theme:get', () => ({
    isDark: nativeTheme.shouldUseDarkColors,
    source: nativeTheme.themeSource,
  }))

  ipcMain.on('theme:set', (_, source: 'system' | 'light' | 'dark') => {
    nativeTheme.themeSource = source
  })

  nativeTheme.on('updated', () => {
    win.webContents.send('theme:updated', nativeTheme.shouldUseDarkColors)
  })
}
