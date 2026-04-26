import type { NormalizedKey, KeyChord } from './types'

export class ChordBuffer {
  private pending: NormalizedKey[] = []
  private timerId: ReturnType<typeof setTimeout> | null = null
  private readonly timeoutMs: number

  constructor(timeoutMs = 1500) {
    this.timeoutMs = timeoutMs
  }

  push(key: NormalizedKey): void {
    this.pending.push(key)
    this._resetTimer()
  }

  matches(chord: KeyChord): 'none' | 'partial' | 'full' {
    if (this.pending.length === 0) return 'none'
    const len = this.pending.length
    for (let i = 0; i < len; i++) {
      if (i >= chord.length) return 'none'
      if (this.pending[i] !== chord[i]) return 'none'
    }
    return len === chord.length ? 'full' : 'partial'
  }

  clear(): void {
    this.pending = []
    this._cancelTimer()
  }

  get length(): number {
    return this.pending.length
  }

  private _resetTimer(): void {
    this._cancelTimer()
    this.timerId = setTimeout(() => this.clear(), this.timeoutMs)
  }

  private _cancelTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }
}
