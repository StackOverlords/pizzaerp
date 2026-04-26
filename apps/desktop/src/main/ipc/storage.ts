import { ipcMain } from 'electron'
import { store } from '../store'

export function registerStorageHandlers() {
  ipcMain.handle('storage:get', (_, key: string) => store.get(key) ?? null)
  ipcMain.handle('storage:set', (_, key: string, value: unknown) => { store.set(key, value) })
  ipcMain.handle('storage:delete', (_, key: string) => { store.delete(key) })
}
