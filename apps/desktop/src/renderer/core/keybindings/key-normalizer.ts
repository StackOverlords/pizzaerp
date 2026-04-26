import type { NormalizedKey, KeyChord } from './types'

const MODIFIER_ALIASES: Readonly<Record<string, string>> = {
  ctrl: 'ctrl', control: 'ctrl',
  shift: 'shift',
  alt: 'alt', opt: 'alt', option: 'alt',
  meta: 'meta', cmd: 'meta', command: 'meta', win: 'meta', windows: 'meta',
}

const KEY_ALIASES: Readonly<Record<string, string>> = {
  return: 'enter',
  esc: 'escape',
  ' ': 'space',
  del: 'delete',
  ins: 'insert',
  pgup: 'pageup',
  pgdn: 'pagedown',
}

const MODIFIER_ORDER = ['ctrl', 'alt', 'shift', 'meta'] as const
type Modifier = (typeof MODIFIER_ORDER)[number]

class KeyNormalizerClass {
  normalize(event: KeyboardEvent): NormalizedKey | null {
    if (event.isComposing) return null

    let raw = event.key
    if (!raw || raw === 'Unidentified') raw = this._codeToKeyName(event.code)
    if (!raw) return null
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(raw)) return null

    const mods: Set<Modifier> = new Set()
    if (event.ctrlKey) mods.add('ctrl')
    if (event.altKey) mods.add('alt')
    if (event.shiftKey) mods.add('shift')
    if (event.metaKey) mods.add('meta')

    return this._build(mods, this._normalizeKeyName(raw))
  }

  normalizeString(raw: string): NormalizedKey {
    const parts = raw.split('+').map((p) => p.trim().toLowerCase())
    const mods: Set<Modifier> = new Set()
    let keyPart = ''

    for (const part of parts) {
      if (part in MODIFIER_ALIASES) {
        const canonical = MODIFIER_ALIASES[part]
        if (this._isMod(canonical)) mods.add(canonical)
      } else {
        keyPart = this._normalizeKeyName(part)
      }
    }

    if (!keyPart) keyPart = parts[parts.length - 1] ?? ''
    return this._build(mods, keyPart)
  }

  normalizeChord(raw: string): KeyChord {
    const segments = raw.trim().split(/\s+/)
    if (segments.length >= 2) {
      return [this.normalizeString(segments[0]), this.normalizeString(segments[1])] as KeyChord
    }
    return [this.normalizeString(segments[0])] as KeyChord
  }

  private _normalizeKeyName(raw: string): string {
    const lower = raw.toLowerCase()
    return KEY_ALIASES[lower] ?? lower
  }

  private _isMod(value: string): value is Modifier {
    return (MODIFIER_ORDER as readonly string[]).includes(value)
  }

  private _codeToKeyName(code: string): string {
    if (!code) return ''
    if (/^Key[A-Z]$/.test(code)) return code[3].toLowerCase()
    if (/^Digit\d$/.test(code)) return code[5]
    return code.toLowerCase()
  }

  private _build(mods: Set<Modifier>, key: string): NormalizedKey {
    const orderedMods = MODIFIER_ORDER.filter((m) => mods.has(m))
    return [...orderedMods, key].filter(Boolean).join('+') as NormalizedKey
  }
}

export const keyNormalizer = new KeyNormalizerClass()
