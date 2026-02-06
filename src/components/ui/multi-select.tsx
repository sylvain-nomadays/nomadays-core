'use client';

import * as React from 'react';
import { X, Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { Button } from './button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import { Input } from './input';
import { Checkbox } from './checkbox';
import { ScrollArea } from './scroll-area';

export interface MultiSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  maxDisplay?: number;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'S\u00e9lectionner...',
  searchPlaceholder = 'Rechercher...',
  emptyMessage = 'Aucun r\u00e9sultat.',
  maxDisplay = 3,
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(searchLower) ||
        option.description?.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  const selectedOptions = React.useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value]
  );

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between min-h-[40px] h-auto',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selectedOptions.length <= maxDisplay ? (
              selectedOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="mr-1 gap-1"
                >
                  {option.icon}
                  {option.label}
                  <button
                    type="button"
                    className="ml-1 rounded-full outline-none hover:bg-gray-200 p-0.5"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => removeOption(option.value, e)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <Badge variant="secondary">
                {selectedOptions.length} s\u00e9lectionn\u00e9(s)
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value.length > 0 && (
              <button
                type="button"
                className="p-1 rounded hover:bg-gray-100"
                onClick={clearAll}
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <ScrollArea className="max-h-[300px]">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <div className="p-1">
              {filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-2 text-sm outline-none transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      option.disabled && 'opacity-50 cursor-not-allowed',
                      isSelected && 'bg-accent/50'
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none"
                      />
                      {option.icon && (
                        <span className="shrink-0">{option.icon}</span>
                      )}
                      <div className="flex flex-col items-start">
                        <span>{option.label}</span>
                        {option.description && (
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {value.length > 0 && (
          <div className="border-t p-2 text-xs text-muted-foreground flex justify-between items-center">
            <span>{value.length} s\u00e9lectionn\u00e9(s)</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-emerald-600 hover:underline"
            >
              Tout effacer
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Mapping country code → currency code (based on destination)
export const COUNTRY_CURRENCIES: Record<string, string> = {
  // Asie du Sud-Est
  TH: 'THB',  // Thaïlande
  VN: 'VND',  // Vietnam
  KH: 'USD',  // Cambodge (utilise USD)
  LA: 'LAK',  // Laos
  MM: 'MMK',  // Myanmar
  ID: 'IDR',  // Indonésie
  MY: 'MYR',  // Malaisie
  SG: 'SGD',  // Singapour
  PH: 'PHP',  // Philippines
  // Asie de l'Est
  CN: 'CNY',  // Chine
  JP: 'JPY',  // Japon
  KR: 'KRW',  // Corée du Sud
  // Asie du Sud
  IN: 'INR',  // Inde
  NP: 'NPR',  // Népal
  LK: 'LKR',  // Sri Lanka
  // Afrique du Nord / Moyen-Orient
  MA: 'MAD',  // Maroc
  TN: 'TND',  // Tunisie
  EG: 'EGP',  // Égypte
  AE: 'AED',  // Émirats
  JO: 'JOD',  // Jordanie
  OM: 'OMR',  // Oman
  // Afrique
  ZA: 'ZAR',  // Afrique du Sud
  TZ: 'TZS',  // Tanzanie
  KE: 'KES',  // Kenya
  // Europe / Turquie
  TR: 'TRY',  // Turquie
  GR: 'EUR',  // Grèce
  IT: 'EUR',  // Italie
  ES: 'EUR',  // Espagne
  PT: 'EUR',  // Portugal
  FR: 'EUR',  // France
  GB: 'GBP',  // UK
};

// Currency labels for display
export const CURRENCY_LABELS: Record<string, string> = {
  EUR: 'Euro (€)',
  USD: 'Dollar US ($)',
  GBP: 'Livre Sterling (£)',
  THB: 'Baht thaïlandais (฿)',
  VND: 'Dong vietnamien (₫)',
  CNY: 'Yuan chinois (¥)',
  JPY: 'Yen japonais (¥)',
  MAD: 'Dirham marocain (DH)',
  TND: 'Dinar tunisien (DT)',
  EGP: 'Livre égyptienne (£E)',
  AED: 'Dirham émirati (AED)',
  IDR: 'Roupie indonésienne (Rp)',
  MYR: 'Ringgit malaisien (RM)',
  SGD: 'Dollar singapourien (S$)',
  INR: 'Roupie indienne (₹)',
  ZAR: 'Rand sud-africain (R)',
  TRY: 'Livre turque (₺)',
  KRW: 'Won coréen (₩)',
  PHP: 'Peso philippin (₱)',
};

// Get currency for selected countries (returns first non-EUR currency, or null as fallback)
export function getCurrencyForCountries(countryCodes: string[]): string | null {
  if (!countryCodes.length) return null;

  // Get unique currencies for selected countries
  const currencies: string[] = countryCodes
    .map(code => COUNTRY_CURRENCIES[code])
    .filter((c): c is string => Boolean(c) && c !== 'EUR'); // Exclude EUR as it's usually the selling currency

  // Return first non-EUR currency found
  const first = currencies[0];
  return first !== undefined ? first : null;
}

// Preset for country selection
export const COUNTRY_OPTIONS: MultiSelectOption[] = [
  { value: 'TH', label: 'Tha\u00eflande', description: 'Asie du Sud-Est' },
  { value: 'VN', label: 'Vietnam', description: 'Asie du Sud-Est' },
  { value: 'KH', label: 'Cambodge', description: 'Asie du Sud-Est' },
  { value: 'LA', label: 'Laos', description: 'Asie du Sud-Est' },
  { value: 'MM', label: 'Myanmar', description: 'Asie du Sud-Est' },
  { value: 'ID', label: 'Indon\u00e9sie', description: 'Asie du Sud-Est' },
  { value: 'MY', label: 'Malaisie', description: 'Asie du Sud-Est' },
  { value: 'SG', label: 'Singapour', description: 'Asie du Sud-Est' },
  { value: 'PH', label: 'Philippines', description: 'Asie du Sud-Est' },
  { value: 'CN', label: 'Chine', description: 'Asie de l\'Est' },
  { value: 'JP', label: 'Japon', description: 'Asie de l\'Est' },
  { value: 'KR', label: 'Cor\u00e9e du Sud', description: 'Asie de l\'Est' },
  { value: 'IN', label: 'Inde', description: 'Asie du Sud' },
  { value: 'NP', label: 'N\u00e9pal', description: 'Asie du Sud' },
  { value: 'LK', label: 'Sri Lanka', description: 'Asie du Sud' },
  { value: 'MA', label: 'Maroc', description: 'Afrique du Nord' },
  { value: 'TN', label: 'Tunisie', description: 'Afrique du Nord' },
  { value: 'EG', label: '\u00c9gypte', description: 'Afrique du Nord' },
  { value: 'ZA', label: 'Afrique du Sud', description: 'Afrique' },
  { value: 'TZ', label: 'Tanzanie', description: 'Afrique' },
  { value: 'KE', label: 'Kenya', description: 'Afrique' },
  { value: 'AE', label: '\u00c9mirats Arabes Unis', description: 'Moyen-Orient' },
  { value: 'JO', label: 'Jordanie', description: 'Moyen-Orient' },
  { value: 'OM', label: 'Oman', description: 'Moyen-Orient' },
  { value: 'TR', label: 'Turquie', description: 'Europe/Asie' },
  { value: 'GR', label: 'Gr\u00e8ce', description: 'Europe' },
  { value: 'IT', label: 'Italie', description: 'Europe' },
  { value: 'ES', label: 'Espagne', description: 'Europe' },
  { value: 'PT', label: 'Portugal', description: 'Europe' },
  { value: 'FR', label: 'France', description: 'Europe' },
];

export function CountryMultiSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <MultiSelect
      options={COUNTRY_OPTIONS}
      value={value}
      onChange={onChange}
      placeholder="S\u00e9lectionner les pays..."
      searchPlaceholder="Rechercher un pays..."
      disabled={disabled}
      className={className}
    />
  );
}
