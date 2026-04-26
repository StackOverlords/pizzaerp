import { ipcRenderer } from 'electron'

export const windowApi = {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  onMaximized: (cb: () => void) => {
    ipcRenderer.on('window:maximized', cb)
    return () => ipcRenderer.removeListener('window:maximized', cb)
  },
  onUnmaximized: (cb: () => void) => {
    ipcRenderer.on('window:unmaximized', cb)
    return () => ipcRenderer.removeListener('window:unmaximized', cb)
  },
}
