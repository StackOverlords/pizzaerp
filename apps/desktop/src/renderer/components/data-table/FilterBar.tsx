import { useState, useEffect, useRef } from 'react'
import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import type {
  FilterDef,
  FilterOption,
  TextFilterDef,
  AsyncSelectFilterDef,
  BooleanFilterDef,
  DateRangeFilterDef,
} from './filter-types'

const addFilterClass =
  'h-7 inline-flex items-center gap-1 rounded-md border border-dashed px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors'

function FilterChip({
  label,
  value,
  onClear,
}: {
  label: string
  value: string
  onClear: () => void
}) {
  return (
    <div className="h-7 inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/8 pl-2 pr-1 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
      <button
        onClick={onClear}
        className="inline-flex items-center justify-center w-4 h-4 rounded-sm hover:bg-primary/20 text-muted-foreground hover:text-foreground"
      >
        <X size={10} />
      </button>
    </div>
  )
}

function SelectChipFilter({
  label,
  placeholder,
  options,
  value,
  isLoading,
  onChange,
}: {
  label: string
  placeholder?: string
  options: FilterOption[]
  value: string | undefined
  isLoading?: boolean
  onChange: (value: string | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedLabel = options.find((o) => o.value === value)?.label

  if (value) {
    return (
      <FilterChip
        label={label}
        value={selectedLabel ?? value}
        onClear={() => onChange(undefined)}
      />
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={addFilterClass}>
        <Plus size={11} />
        {label}
      </PopoverTrigger>
      <PopoverContent className="p-0 w-48" align="start" side="bottom">
        {isLoading ? (
          <div className="p-2 space-y-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          <Command>
            <CommandInput
              placeholder={placeholder ?? `Buscar ${label.toLowerCase()}...`}
              className="h-8 text-xs"
            />
            <CommandList>
              <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">
                Sin resultados
              </CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => { onChange(opt.value); setOpen(false) }}
                    className="text-xs cursor-pointer"
                  >
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  )
}

function AsyncSelectFilter<TFilters extends Record<string, unknown>>({
  def,
  value,
  onChange,
}: {
  def: AsyncSelectFilterDef<TFilters>
  value: string | undefined
  onChange: (value: string | undefined) => void
}) {
  const { data: options = [], isLoading } = def.useOptions()
  return (
    <SelectChipFilter
      label={def.label}
      placeholder={def.placeholder}
      options={options}
      value={value}
      isLoading={isLoading}
      onChange={onChange}
    />
  )
}

function TextFilter<TFilters extends Record<string, unknown>>({
  def,
  value,
  onChange,
}: {
  def: TextFilterDef<TFilters>
  value: string | undefined
  onChange: (value: string | undefined) => void
}) {
  const [local, setLocal] = useState(value ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocal(value ?? '') }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setLocal(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(v || undefined), 300)
  }

  return (
    <div className="relative">
      <Input
        value={local}
        onChange={handleChange}
        placeholder={def.placeholder ?? def.label}
        className="h-7 text-xs w-36 pr-6"
      />
      {local && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => { setLocal(''); onChange(undefined) }}
        >
          <X size={11} />
        </button>
      )}
    </div>
  )
}

function DateRangeFilter<TFilters extends Record<string, unknown>>({
  def,
  fromValue,
  toValue,
  onChange,
}: {
  def: DateRangeFilterDef<TFilters>
  fromValue: string | undefined
  toValue: string | undefined
  onChange: (update: Partial<TFilters>) => void
}) {
  const toDateInput = (iso: string | undefined) => iso?.slice(0, 10) ?? ''

  const hasAny = !!(fromValue || toValue)

  // When both dates are set, show as a chip
  if (fromValue && toValue) {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    return (
      <FilterChip
        label={def.label}
        value={`${fmt(fromValue)} — ${fmt(toValue)}`}
        onClear={() => onChange({ [def.fromKey]: undefined, [def.toKey]: undefined } as Partial<TFilters>)}
      />
    )
  }

  // Otherwise show the date inputs inline
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground shrink-0">{def.label}</span>
      <Input
        type="date"
        value={toDateInput(fromValue)}
        onChange={(e) => {
          const date = e.target.value
          onChange({ [def.fromKey]: date ? `${date}T00:00:00.000Z` : undefined } as Partial<TFilters>)
        }}
        className="h-7 text-xs w-[122px]"
      />
      <span className="text-xs text-muted-foreground">—</span>
      <Input
        type="date"
        value={toDateInput(toValue)}
        onChange={(e) => {
          const date = e.target.value
          onChange({ [def.toKey]: date ? `${date}T23:59:59.999Z` : undefined } as Partial<TFilters>)
        }}
        className="h-7 text-xs w-[122px]"
      />
      {hasAny && (
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => onChange({ [def.fromKey]: undefined, [def.toKey]: undefined } as Partial<TFilters>)}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

function BooleanFilter<TFilters extends Record<string, unknown>>({
  def,
  value,
  onChange,
}: {
  def: BooleanFilterDef<TFilters>
  value: boolean | undefined
  onChange: (value: boolean | undefined) => void
}) {
  const id = `filter-bool-${def.id}`
  return (
    <div className="flex items-center gap-1.5">
      <Switch
        id={id}
        checked={value ?? false}
        onCheckedChange={(checked) => onChange(checked || undefined)}
        className="scale-75 origin-left"
      />
      <label htmlFor={id} className="text-xs cursor-pointer select-none">
        {def.label}
      </label>
    </div>
  )
}

export function FilterBar<TFilters extends Record<string, unknown>>({
  defs,
  values,
  onChange,
}: {
  defs: FilterDef<TFilters>[]
  values: Partial<TFilters>
  onChange: (update: Partial<TFilters>) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {defs.map((def) => {
        if (def.type === 'text') {
          return (
            <TextFilter
              key={def.id}
              def={def}
              value={values[def.id] as string | undefined}
              onChange={(v) => onChange({ [def.id]: v } as Partial<TFilters>)}
            />
          )
        }

        if (def.type === 'select') {
          return (
            <SelectChipFilter
              key={def.id}
              label={def.label}
              placeholder={def.placeholder}
              options={def.options}
              value={values[def.id] as string | undefined}
              onChange={(v) => onChange({ [def.id]: v } as Partial<TFilters>)}
            />
          )
        }

        if (def.type === 'asyncselect') {
          return (
            <AsyncSelectFilter
              key={def.id}
              def={def}
              value={values[def.id] as string | undefined}
              onChange={(v) => onChange({ [def.id]: v } as Partial<TFilters>)}
            />
          )
        }

        if (def.type === 'daterange') {
          return (
            <DateRangeFilter
              key={def.id}
              def={def}
              fromValue={values[def.fromKey] as string | undefined}
              toValue={values[def.toKey] as string | undefined}
              onChange={onChange}
            />
          )
        }

        if (def.type === 'boolean') {
          return (
            <BooleanFilter
              key={def.id}
              def={def}
              value={values[def.id] as boolean | undefined}
              onChange={(v) => onChange({ [def.id]: v } as Partial<TFilters>)}
            />
          )
        }

        return null
      })}
    </div>
  )
}
