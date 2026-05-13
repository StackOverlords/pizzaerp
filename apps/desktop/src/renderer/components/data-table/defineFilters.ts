import type { FilterDef } from './filter-types'

export function defineFilters<TFilters extends Record<string, unknown>>(
  defs: FilterDef<TFilters>[],
): FilterDef<TFilters>[] {
  return defs
}
