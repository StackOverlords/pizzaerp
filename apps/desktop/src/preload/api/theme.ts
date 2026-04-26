import { ipcRenderer } from 'electron'

export const themeApi = {
  get: (): Promise<{ isDark: boolean; source: 'system' | 'light' | 'dark' }> => ipcRenderer.invoke('theme:get'),
  set: (source: 'system' | 'light' | 'dark') => ipcRenderer.send('theme:set', source),
  onUpdated: (cb: (isDark: boolean) => void) => {
    const handler = (_: Electron.IpcRendererEvent, isDark: boolean) => cb(isDark)
    ipcRenderer.on('theme:updated', handler)
    return () => ipcRenderer.removeListener('theme:updated', handler)
  },
}
