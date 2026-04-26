import { BrowserWindow } from 'electron'
import path from 'node:path'
import { registerAllHandlers } from './ipc'

export function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
    },
  })

  win.once('ready-to-show', () => win.show())

  win.on('maximize', () => win.webContents.send('window:maximized'))
  win.on('unmaximize', () => win.webContents.send('window:unmaximized'))

  registerAllHandlers(win)

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const loadDevServer = () => win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    win.webContents.on('did-fail-load', (_e, code) => {
      if (code === -102 || code === -106 || code === -300) {
        setTimeout(loadDevServer, 300)
      }
    })
    loadDevServer()
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    )
  }

  return win
}
