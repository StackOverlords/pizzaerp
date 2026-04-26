import { contextBridge } from 'electron'
import { windowApi } from './api/window'
import { themeApi } from './api/theme'
import { storageApi } from './api/storage'

contextBridge.exposeInMainWorld('electron', {
  window: windowApi,
  theme: themeApi,
  storage: storageApi,
})
