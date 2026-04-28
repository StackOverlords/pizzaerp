import { useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { commandRegistry } from '@/core/commands/command-registry'
import { keybindingRegistry } from '@/core/keybindings/keybinding-registry'
import { keyNormalizer } from '@/core/keybindings/key-normalizer'
import { useKeybindingStore } from '@/core/keybindings/keybinding-store'
import { KEYBINDING_SOURCE } from '@/core/keybindings/types'
import { formatKey } from '@/core/keybindings/format'
import type { KeyChord } from '@/core/keybindings/types'

function ChordBadge({ chord }: { chord: KeyChord }) {
  return (
    <span className="flex items-center gap-1">
      {chord.map((key, i) => (
        <kbd
          key={i}
          className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-muted text-muted-foreground select-none"
        >
          {formatKey(key)}
        </kbd>
      ))}
    </span>
  )
}

export function KeybindingsSection() {
  const { t } = useTranslation()
  const { overrides, addOverride, removeOverride, resetAll } = useKeybindingStore()
  const [search, setSearch] = useState('')
  const [capturing, setCapturing] = useState<string | null>(null)

  const rows = useMemo(() => {
    const effectiveBindings = keybindingRegistry.getAll()
    const bindingByCmd = new Map(effectiveBindings.map((b) => [b.commandId, b]))
    return commandRegistry.getAll().map((cmd) => ({
      commandId: cmd.id,
      label:     cmd.label,
      binding:   bindingByCmd.get(cmd.id) ?? null,
    }))
  }, [overrides])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) => r.label.toLowerCase().includes(q) || r.commandId.toLowerCase().includes(q)
    )
  }, [rows, search])

  useEffect(() => {
    if (!capturing) return

    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') { setCapturing(null); return }

      const key = keyNormalizer.normalize(e)
      if (!key) return

      addOverride({ commandId: capturing, chord: [key], source: KEYBINDING_SOURCE.USER })
      setCapturing(null)
    }

    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [capturing, addOverride])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">{t('settings.keybindings.title')}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t('settings.keybindings.description')}</p>
      </div>

      <Separator />

      <Input
        placeholder={t('settings.keybindings.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-sm"
      />

      <div className="space-y-0.5">
        {filtered.map((row) => {
          const isCapturing    = capturing === row.commandId
          const isUserOverride = row.binding?.source === KEYBINDING_SOURCE.USER

          return (
            <div
              key={row.commandId}
              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent/50 group"
            >
              <span className="text-sm text-foreground flex-1 min-w-0 truncate pr-4">
                {row.label}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                {isCapturing ? (
                  <span className="text-xs text-muted-foreground animate-pulse px-1">
                    {t('settings.keybindings.pressKey')}
                  </span>
                ) : row.binding ? (
                  <button
                    onClick={() => setCapturing(row.commandId)}
                    title={t('settings.keybindings.clickToEdit')}
                  >
                    <ChordBadge chord={row.binding.chord} />
                  </button>
                ) : (
                  <button
                    onClick={() => setCapturing(row.commandId)}
                    className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {t('settings.keybindings.add')}
                  </button>
                )}

                {isUserOverride && row.binding && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t('settings.keybindings.reset')}
                    onClick={() => removeOverride(row.binding!.chord[0], row.commandId)}
                  >
                    <RotateCcw size={12} />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {overrides.length > 0 && (
        <>
          <Separator />
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={resetAll}>
              {t('settings.keybindings.resetAll')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
