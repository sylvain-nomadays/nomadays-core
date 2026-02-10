'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Search, X, Building2 } from 'lucide-react';
import { loadGoogleMapsScript, isGoogleMapsConfigured } from '@/lib/google-maps';

// ============================================================================
// Types
// ============================================================================

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  address_components?: {
    long_name: string;
    short_name: string;
    types: string[];
  }[];
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  // Parsed from address_components
  city?: string;
  country_code?: string;
}

interface GooglePlacesAutocompleteProps {
  value?: string;
  placeholder?: string;
  onPlaceSelect: (place: PlaceResult | null) => void;
  types?: string[]; // ['establishment', 'geocode', 'address', '(cities)', 'lodging']
  countryRestrictions?: string[]; // ['ma', 'fr', 'th']
  className?: string;
  disabled?: boolean;
  // For pre-population from existing data
  initialPlaceId?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function GooglePlacesAutocomplete({
  value = '',
  placeholder = "Rechercher un lieu...",
  onPlaceSelect,
  types = ['establishment', 'geocode'],
  countryRestrictions,
  className = '',
  disabled = false,
  initialPlaceId,
}: GooglePlacesAutocompleteProps) {
  // Use local state only for user typing - display value from prop when not focused
  const [localInputValue, setLocalInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMapsLoaded, setIsMapsLoaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // The displayed value: use local value when focused, otherwise use prop value
  const displayValue = isFocused ? localInputValue : value;

  // Load Google Maps script
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        setIsMapsLoaded(true);
        autocompleteService.current = new google.maps.places.AutocompleteService();
        // PlacesService requires a map or div element
        const dummyDiv = document.createElement('div');
        placesService.current = new google.maps.places.PlacesService(dummyDiv);
        sessionToken.current = new google.maps.places.AutocompleteSessionToken();
      })
      .catch((err) => {
        setError('Google Maps non disponible');
        console.error(err);
      });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for predictions
  const searchPlaces = useCallback(
    async (query: string) => {
      if (!query.trim() || !autocompleteService.current) {
        setPredictions([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const request: google.maps.places.AutocompletionRequest = {
          input: query,
          sessionToken: sessionToken.current || undefined,
        };

        // Add type restrictions if specified
        if (types.length > 0) {
          request.types = types;
        }

        // Add country restrictions if specified
        if (countryRestrictions && countryRestrictions.length > 0) {
          request.componentRestrictions = { country: countryRestrictions };
        }

        const results = await new Promise<google.maps.places.AutocompletePrediction[]>(
          (resolve, reject) => {
            autocompleteService.current!.getPlacePredictions(
              request,
              (predictions, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                  resolve(predictions);
                } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                  resolve([]);
                } else {
                  reject(new Error(status));
                }
              }
            );
          }
        );

        setPredictions(results);
        setIsOpen(results.length > 0);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Places search error:', errorMsg);
        if (errorMsg.includes('REQUEST_DENIED')) {
          setError('Clé API non autorisée — activer "Places API" dans Google Cloud Console');
        } else if (errorMsg.includes('OVER_QUERY_LIMIT')) {
          setError('Quota dépassé — réessayez plus tard');
        } else if (errorMsg.includes('INVALID_REQUEST')) {
          setError('Requête invalide — vérifiez votre saisie');
        } else {
          setError(`Erreur de recherche (${errorMsg})`);
        }
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [types, countryRestrictions]
  );

  // Debounced search - only trigger when focused and typing
  useEffect(() => {
    // Only search if user is focused (actively using the input)
    if (!isFocused) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (localInputValue.length >= 2 && isMapsLoaded) {
        searchPlaces(localInputValue);
      } else {
        setPredictions([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localInputValue, searchPlaces, isMapsLoaded, isFocused]);

  // Get place details when selection is made
  const handleSelect = async (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;

    setIsLoading(true);
    setIsOpen(false);
    setLocalInputValue(prediction.description);
    setIsFocused(false); // Exit focused state after selection

    try {
      const details = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.current!.getDetails(
          {
            placeId: prediction.place_id,
            fields: ['place_id', 'name', 'formatted_address', 'address_components', 'geometry'],
            sessionToken: sessionToken.current || undefined,
          },
          (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
              resolve(place);
            } else {
              reject(new Error(status));
            }
          }
        );
      });

      // Parse address components
      let city: string | undefined;
      let countryCode: string | undefined;

      if (details.address_components) {
        for (const component of details.address_components) {
          if (component.types.includes('locality')) {
            city = component.long_name;
          } else if (component.types.includes('administrative_area_level_1') && !city) {
            city = component.long_name;
          } else if (component.types.includes('country')) {
            countryCode = component.short_name;
          }
        }
      }

      const result: PlaceResult = {
        place_id: details.place_id || prediction.place_id,
        name: details.name || prediction.structured_formatting?.main_text || '',
        formatted_address: details.formatted_address || prediction.description,
        address_components: details.address_components?.map((c) => ({
          long_name: c.long_name,
          short_name: c.short_name,
          types: c.types,
        })),
        geometry: details.geometry?.location
          ? {
              location: {
                lat: details.geometry.location.lat(),
                lng: details.geometry.location.lng(),
              },
            }
          : undefined,
        city,
        country_code: countryCode,
      };

      onPlaceSelect(result);

      // Reset session token for next session
      sessionToken.current = new google.maps.places.AutocompleteSessionToken();
    } catch (err) {
      console.error('Failed to get place details:', err);
      setError('Erreur lors de la récupération des détails');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setLocalInputValue('');
    setPredictions([]);
    setIsOpen(false);
    onPlaceSelect(null);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalInputValue(e.target.value);
    if (!e.target.value) {
      onPlaceSelect(null);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setLocalInputValue(value); // Sync with prop value when focusing
    if (predictions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Check if we're clicking on a prediction (relatedTarget is inside container)
    const relatedTarget = e.relatedTarget as Node | null;
    if (containerRef.current && relatedTarget && containerRef.current.contains(relatedTarget)) {
      // Clicking on a prediction button, don't close
      return;
    }

    // Delay to allow click on predictions (for touch devices and other cases)
    setTimeout(() => {
      setIsFocused(false);
      setIsOpen(false);
    }, 250);
  };

  // If Google Maps is not configured, show a simple input
  if (!isGoogleMapsConfigured()) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              // Just pass the raw text, no place details (fallback mode)
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
        <p className="mt-1 text-xs text-amber-600">
          Configurer NEXT_PUBLIC_GOOGLE_MAPS_API_KEY pour l'autocomplétion
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled || !isMapsLoaded}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
          {displayValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* Predictions dropdown */}
      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              tabIndex={0}
              onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
              onClick={() => handleSelect(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-b-0"
            >
              <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {prediction.structured_formatting?.main_text || prediction.description}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {prediction.structured_formatting?.secondary_text || ''}
                </p>
              </div>
            </button>
          ))}
          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 flex items-center gap-1">
            <img
              src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3_hdpi.png"
              alt="Powered by Google"
              className="h-3"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper type declarations for google maps
// ============================================================================

declare global {
  interface Window {
    google?: typeof google;
  }
}
