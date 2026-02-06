'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { usePlacesAutocomplete } from '@/hooks/useTripLocations';
import type { PlaceAutocompleteResult } from '@/lib/api/types';

interface LocationAutocompleteProps {
  onSelect: (result: PlaceAutocompleteResult) => void;
  placeholder?: string;
  countryFilter?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Location autocomplete component using Google Places API.
 * Type a location name (e.g., "Chiang Mai") and get suggestions.
 */
export function LocationAutocomplete({
  onSelect,
  placeholder = 'Rechercher un lieu...',
  countryFilter,
  className,
  disabled = false,
  autoFocus = false,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { search, results, clear, loading, error } = usePlacesAutocomplete();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        search(query, countryFilter);
        setIsOpen(true);
      } else {
        clear();
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, countryFilter, search, clear]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: PlaceAutocompleteResult) => {
    onSelect(result);
    setQuery('');
    clear();
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        const selectedResult = results[selectedIndex];
        if (selectedIndex >= 0 && selectedIndex < results.length && selectedResult) {
          handleSelect(selectedResult);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleClear = () => {
    setQuery('');
    clear();
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <X className="h-4 w-4 text-gray-400" />
            )}
          </button>
        )}
      </div>

      {/* Dropdown with results */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[300px] overflow-auto">
          {error && (
            <div className="p-3 text-sm text-red-600">
              Erreur de recherche. Veuillez réessayer.
            </div>
          )}

          {!error && results.length === 0 && query.length >= 2 && !loading && (
            <div className="p-3 text-sm text-gray-500">
              Aucun résultat pour "{query}"
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => handleSelect(result)}
              className={cn(
                'w-full px-3 py-2 text-left flex items-start gap-3 hover:bg-gray-50 transition-colors',
                index === selectedIndex && 'bg-emerald-50'
              )}
            >
              <MapPin className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {result.main_text}
                </div>
                {result.secondary_text && (
                  <div className="text-sm text-gray-500 truncate">
                    {result.secondary_text}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LocationAutocomplete;
