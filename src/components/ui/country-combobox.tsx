'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { COUNTRIES, getCountryByCode } from '@/lib/constants/countries'

interface CountryComboboxProps {
  value: string
  onChange: (code: string) => void
  placeholder?: string
  className?: string
}

export function CountryCombobox({
  value,
  onChange,
  placeholder = 'Sélectionner un pays...',
  className,
}: CountryComboboxProps) {
  const [open, setOpen] = useState(false)

  const selected = value ? getCountryByCode(value) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          {selected ? (
            <span className="flex items-center gap-2">
              <span>{selected.flag}</span>
              <span>{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un pays..." />
          <CommandList>
            <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code}`}
                  onSelect={() => {
                    onChange(country.code)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === country.code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="mr-2">{country.flag}</span>
                  {country.name}
                  <span className="ml-auto text-xs text-muted-foreground">{country.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
