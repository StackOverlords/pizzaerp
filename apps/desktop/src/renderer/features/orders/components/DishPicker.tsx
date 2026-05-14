import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { formatCurrency } from '@/lib/format'
import { useDishes } from '../api'
import type { Dish } from '../schemas'

interface DishPickerProps {
  value: string | null
  onChange: (dishId: string, dish: Dish) => void
  disabled?: boolean
  placeholder?: string
}

export function DishPicker({ value, onChange, disabled = false, placeholder = 'Seleccionar platillo...' }: DishPickerProps) {
  const [open, setOpen] = useState(false)
  const { data: dishes = [], isLoading, isError } = useDishes({ activeOnly: true })

  const selectedDish = dishes.find((d) => d.id === value)

  if (isLoading) {
    return <Skeleton className="h-9 w-full" />
  }

  if (isError) {
    return (
      <div className="space-y-1">
        <PopoverTrigger
          disabled
          className={cn(
            'h-9 w-full inline-flex items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          Error al cargar platillos
        </PopoverTrigger>
        <p className="text-xs text-destructive">No se pudieron cargar los platillos.</p>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'h-9 w-full inline-flex items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm',
          'hover:bg-accent hover:text-accent-foreground transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {selectedDish ? (
          <span>
            {selectedDish.name}{' '}
            <span className="text-muted-foreground">({formatCurrency(selectedDish.salePrice)})</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="start" side="bottom">
        {dishes.length === 0 ? (
          <div className="p-4 text-sm text-center text-muted-foreground">
            No hay platillos disponibles
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Buscar platillo..." className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">
                Sin resultados
              </CommandEmpty>
              <CommandGroup>
                {dishes.map((dish) => (
                  <CommandItem
                    key={dish.id}
                    value={dish.name}
                    onSelect={() => {
                      onChange(dish.id, dish)
                      setOpen(false)
                    }}
                    className="text-xs cursor-pointer"
                  >
                    <span className="flex-1">{dish.name}</span>
                    <span className="text-muted-foreground mr-2">{formatCurrency(dish.salePrice)}</span>
                    {value === dish.id && <Check size={13} className="shrink-0" />}
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
