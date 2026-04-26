import type { NormalizedKey, KeyChord } from './types'
import { keyNormalizer } from './key-normalizer'
import { ChordBuffer } from './chord-buffer'
import { keybindingRegistry } from './keybinding-registry'
import { commandRegistry } from '@/core/commands/command-registry'

function isInputTarget(event: KeyboardEvent): boolean {
  const target = event.target
  if (!(target instanceof Element)) return false
  const tag = target.tagName.toUpperCase()
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  if (target.getAttribute('contenteditable') === 'true') return true
  return false
}

class KeybindingServiceClass {
  private readonly buffer: ChordBuffer = new ChordBuffer()
  private sequence: NormalizedKey[] = []
  private boundHandler: ((event: KeyboardEvent) => void) | null = null
  private keyupFallbackHandler: ((event: KeyboardEvent) => void) | null = null
  private lastDispatchedChord: NormalizedKey | null = null

  initialize(): void {
    this.boundHandler = (event) => this.handleKeyEvent(event)
    document.addEventListener('keydown', this.boundHandler, true)

    this.keyupFallbackHandler = (event) => {
      if (event.isComposing) return
      const normalizedKey = keyNormalizer.normalize(event)
      const prevDispatched = this.lastDispatchedChord
      this.lastDispatchedChord = null
      if (!normalizedKey) return
      if (prevDispatched === normalizedKey) return

      const chord: KeyChord = [normalizedKey]
      const entry = keybindingRegistry.resolve(chord)
      if (!entry) return
      if (isInputTarget(event) && !entry.allowInInput) return
      event.preventDefault()
      void commandRegistry.execute(entry.commandId)
    }
    document.addEventListener('keyup', this.keyupFallbackHandler, true)
  }

  dispose(): void {
    if (this.boundHandler) {
      document.removeEventListener('keydown', this.boundHandler, true)
      this.boundHandler = null
    }
    if (this.keyupFallbackHandler) {
      document.removeEventListener('keyup', this.keyupFallbackHandler, true)
      this.keyupFallbackHandler = null
    }
    this.lastDispatchedChord = null
    this._reset()
  }

  handleKeyEvent(event: KeyboardEvent): boolean {
    if (event.isComposing) return false
    const normalizedKey = keyNormalizer.normalize(event)
    if (normalizedKey === null) return false
    this.sequence.push(normalizedKey)
    this.buffer.push(normalizedKey)
    return this._process(event)
  }

  private _process(event: KeyboardEvent): boolean {
    const seq = this.sequence
    if (seq.length === 0) return false

    if (seq.length === 1) {
      const firstKey = seq[0]
      const hasPartialCandidate = keybindingRegistry
        .getAll()
        .some((entry) => entry.chord.length === 2 && entry.chord[0] === firstKey)

      if (hasPartialCandidate) {
        event.preventDefault()
        return false
      }

      return this._tryExecute(event, [firstKey])
    }

    const twoKeyChord: KeyChord = [seq[0], seq[1]]
    const matched = this._tryExecute(event, twoKeyChord)
    if (!matched) this._reset()
    return matched
  }

  private _tryExecute(event: KeyboardEvent, chord: KeyChord): boolean {
    const entry = keybindingRegistry.resolve(chord)
    if (!entry) {
      this._reset()
      return false
    }
    if (isInputTarget(event) && !entry.allowInInput) {
      this._reset()
      return false
    }
    event.preventDefault()
    this._reset()
    if (chord.length === 1) this.lastDispatchedChord = chord[0]
    void commandRegistry.execute(entry.commandId)
    return true
  }

  private _reset(): void {
    this.sequence = []
    this.buffer.clear()
  }
}

export const keybindingService = new KeybindingServiceClass()
