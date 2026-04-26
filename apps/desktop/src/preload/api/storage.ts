import { ipcRenderer } from 'electron'

export const storageApi = {
  get: <T>(key: string): Promise<T | null> => ipcRenderer.invoke('storage:get', key),
  set: <T>(key: string, value: T): Promise<void> => ipcRenderer.invoke('storage:set', key, value),
  delete: (key: string): Promise<void> => ipcRenderer.invoke('storage:delete', key),
}
