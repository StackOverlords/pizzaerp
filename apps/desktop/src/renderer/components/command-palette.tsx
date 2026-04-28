import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { commandRegistry } from '@/core/commands/command-registry'
import { useCommandPaletteStore } from '@/core/commands/command-palette-store'
import { getShortcutLabel } from '@/core/keybindings/format'
import type { CommandEntry } from '@/core/commands/types'

const GROUP_LABELS: Record<string, string> = {
  workbench: 'General',
  settings:  'Configuración',
  orders:    'Órdenes',
  menu:      'Menú',
  staff:     'Personal',
  reports:   'Reportes',
}

function groupCommands(commands: CommandEntry[]): Map<string, CommandEntry[]> {
  const groups = new Map<string, CommandEntry[]>()
  for (const cmd of commands) {
    const namespace = cmd.id.split('.')[0]
    const key = namespace ?? 'general'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(cmd)
  }
  return groups
}

export function CommandPalette() {
  const { t } = useTranslation()
  const { isOpen, close } = useCommandPaletteStore()

  const groups = useMemo(
    () => groupCommands(commandRegistry.getPaletteCommands()),
    // re-scan registry cada vez que la paleta abre
    [isOpen]
  )

  const handleSelect = (commandId: string) => {
    close()
    // Deja que el dialog cierre antes de ejecutar (por si el comando navega o abre otro dialog)
    setTimeout(() => { void commandRegistry.execute(commandId) }, 0)
  }

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => { if (!open) close() }}>
      <Command>
        <CommandInput placeholder={t('commandPalette.placeholder')} />
        <CommandList>
          <CommandEmpty>{t('commandPalette.empty')}</CommandEmpty>
          {[...groups.entries()].map(([namespace, cmds]) => (
            <CommandGroup
              key={namespace}
              heading={GROUP_LABELS[namespace] ?? namespace}
            >
              {cmds.map((cmd) => {
                const shortcut = getShortcutLabel(cmd.id)
                return (
                  <CommandItem
                    key={cmd.id}
                    value={cmd.label}
                    onSelect={() => handleSelect(cmd.id)}
                  >
                    {cmd.label}
                    {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
