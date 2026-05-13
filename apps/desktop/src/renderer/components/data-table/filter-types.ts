export type FilterTarget = 'params' | 'body'

export interface FilterOption {
  label: string
  value: string
}

type FilterBase = {
  label: string
  target?: FilterTarget
  placeholder?: string
}

export type TextFilterDef<TFilters extends Record<string, unknown>> = FilterBase & {
  type: 'text'
  id: keyof TFilters & string
}

export type SelectFilterDef<TFilters extends Record<string, unknown>> = FilterBase & {
  type: 'select'
  id: keyof TFilters & string
  options: FilterOption[]
}

export type AsyncSelectFilterDef<TFilters extends Record<string, unknown>> = FilterBase & {
  type: 'asyncselect'
  id: keyof TFilters & string
  useOptions: () => { data?: FilterOption[]; isLoading?: boolean }
}

export type BooleanFilterDef<TFilters extends Record<string, unknown>> = FilterBase & {
  type: 'boolean'
  id: keyof TFilters & string
}

// Date range controls two separate filter keys, so `id` is a logical name only
export type DateRangeFilterDef<TFilters extends Record<string, unknown>> = FilterBase & {
  type: 'daterange'
  id: string
  fromKey: keyof TFilters & string
  toKey: keyof TFilters & string
}

export type FilterDef<TFilters extends Record<string, unknown>> =
  | TextFilterDef<TFilters>
  | SelectFilterDef<TFilters>
  | AsyncSelectFilterDef<TFilters>
  | BooleanFilterDef<TFilters>
  | DateRangeFilterDef<TFilters>
