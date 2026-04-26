import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { registerDefaultCommands } from '@/core/commands/default-commands'
import { registerSettingsCommands } from '@/features/settings'
import { registerDefaultKeybindings } from '@/core/keybindings'
import { initI18n } from '@/core/i18n'
import { storage } from '@/lib/storage/adapter'
import { StorageKeys } from '@/lib/storage/keys'

async function bootstrap() {
  const savedLang = await storage.get<string>(StorageKeys.language)
  await initI18n(savedLang)

  registerDefaultCommands()
  registerSettingsCommands()
  registerDefaultKeybindings()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

bootstrap()
