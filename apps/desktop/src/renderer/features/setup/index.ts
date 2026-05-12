import { commandRegistry } from '@/core/commands/command-registry'

export function registerSetupCommands() {
  commandRegistry.register('setup.action.submit', 'Iniciar instalación', () => {})
}
