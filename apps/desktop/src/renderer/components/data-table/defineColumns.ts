import type { ColumnDefConfig } from './types'

export function defineColumns<T extends object>(columns: ColumnDefConfig<T>[]): ColumnDefConfig<T>[] {
  return columns
}
