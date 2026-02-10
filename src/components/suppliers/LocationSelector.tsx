'use client';

import { useState, useCallback, useMemo } from 'react';
import { Check, ChevronsUpDown, MapPin, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useLocations, useLocation, useCreateLocation } from '@/hooks/useLocations';
import type { Location, LocationType } from '@/lib/api/types';

interface LocationSelectorProps {
  /** ID de la location sélectionnée */
  value?: number | null;
  /** Callback quand la sélection change */
  onChange: (locationId: number | null) => void;
  /** Filtrer par pays */
  countryCode?: string;
  /** Filtrer par type de location */
  locationType?: LocationType;
  /** Placeholder */
  placeholder?: string;
  /** Désactivé */
  disabled?: boolean;
  /** Permettre de créer une nouvelle location */
  allowCreate?: boolean;
  /** Afficher le bouton de suppression */
  clearable?: boolean;
  /** Classe CSS additionnelle */
  className?: string;
}

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  city: 'Ville',
  region: 'Région',
  country: 'Pays',
  area: 'Zone',
  neighborhood: 'Quartier',
};

export function LocationSelector({
  value,
  onChange,
  countryCode,
  locationType,
  placeholder = 'Sélectionner une destination...',
  disabled = false,
  allowCreate = false,
  clearable = true,
  className,
}: LocationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch locations with filters
  const { locations, isLoading, refetch } = useLocations({
    country_code: countryCode,
    location_type: locationType,
    search: search.length > 1 ? search : undefined,
    is_active: true,
    page_size: 50,
  });

  // Fetch the selected location by ID (independent of search results)
  const { data: fetchedLocation } = useLocation(value ?? null);

  // Create location mutation
  const { mutate: createLocation, loading: isCreating } = useCreateLocation();

  // Find selected location: first in search results, then from dedicated fetch
  const selectedLocation = useMemo(() => {
    return locations.find((loc) => loc.id === value) || fetchedLocation || null;
  }, [locations, value, fetchedLocation]);

  // Handle selection
  const handleSelect = useCallback(
    (locationId: number) => {
      onChange(locationId);
      setOpen(false);
      setSearch('');
    },
    [onChange]
  );

  // Handle clear
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
    },
    [onChange]
  );

  // Handle create new location
  const handleCreate = useCallback(async () => {
    if (!search.trim()) return;

    try {
      // Auto-capitalize: "bangkok" → "Bangkok", "chiang mai" → "Chiang Mai"
      const capitalizedName = search.trim().replace(/\b\w/g, c => c.toUpperCase());
      const newLocation = await createLocation({
        name: capitalizedName,
        location_type: locationType || 'city',
        country_code: countryCode,
      });

      if (newLocation) {
        onChange(newLocation.id);
        setOpen(false);
        setSearch('');
        refetch();
      }
    } catch (error) {
      console.error('Erreur lors de la création de la location:', error);
    }
  }, [search, createLocation, locationType, countryCode, onChange, refetch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !selectedLocation && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 opacity-50" />
            {selectedLocation ? (
              <span className="truncate">
                {selectedLocation.name}
                {selectedLocation.country_code && (
                  <span className="ml-1 text-muted-foreground">
                    ({selectedLocation.country_code})
                  </span>
                )}
              </span>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selectedLocation && clearable && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onChange(null);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onChange(null); } }}
                className="p-1 hover:bg-muted rounded cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Rechercher une destination..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Chargement...
                </div>
              ) : allowCreate && search.trim() ? (
                <div className="py-2 px-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={handleCreate}
                    disabled={isCreating}
                  >
                    <Plus className="h-4 w-4" />
                    Créer "{search.trim()}"
                  </Button>
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Aucune destination trouvée.
                </div>
              )}
            </CommandEmpty>

            {locations.length > 0 && (
              <CommandGroup heading="Destinations">
                {locations.map((location) => (
                  <CommandItem
                    key={location.id}
                    value={location.name}
                    onSelect={() => handleSelect(location.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">{location.name}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {location.country_code && (
                            <span>{location.country_code}</span>
                          )}
                          {location.location_type && (
                            <>
                              {location.country_code && <span>•</span>}
                              <span>
                                {LOCATION_TYPE_LABELS[location.location_type]}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {location.accommodation_count !== undefined &&
                        location.accommodation_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {location.accommodation_count} héb.
                          </Badge>
                        )}
                      <Check
                        className={cn(
                          'h-4 w-4',
                          value === location.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {allowCreate && search.trim() && locations.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreate}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer "{search.trim()}"
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
