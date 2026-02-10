'use client';

import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { Map, MapPin, Navigation, Trash2, RefreshCw, Loader2, Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useTripMapData,
  useGeocodeAndCreateLocation,
  useDeleteTripLocation,
  useCalculateRoutes,
} from '@/hooks/useTripLocations';
import { LocationAutocomplete } from './LocationAutocomplete';
import type { TripLocation, TripRoute, PlaceAutocompleteResult, TripLocationType } from '@/lib/api/types';

interface TripMapEditorProps {
  tripId: number;
  destinationCountries?: string[];
  className?: string;
}

// Map marker colors by type
const MARKER_COLORS: Record<TripLocationType, string> = {
  overnight: '#10b981', // emerald-500
  waypoint: '#3b82f6', // blue-500
  poi: '#f59e0b', // amber-500
  activity: '#8b5cf6', // violet-500
};

const LOCATION_TYPE_LABELS: Record<TripLocationType, string> = {
  overnight: 'Nuit',
  waypoint: 'Étape',
  poi: 'Point d\'intérêt',
  activity: 'Activité',
};

/**
 * Trip Map Editor component.
 * Allows adding locations by searching, displays them on a map,
 * and calculates routes between them.
 */
export function TripMapEditor({
  tripId,
  destinationCountries,
  className,
}: TripMapEditorProps) {
  const [selectedLocationType, setSelectedLocationType] = useState<TripLocationType>('overnight');
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | undefined>(undefined);

  // API hooks
  const { mapData, locations, routes, isLoading, refetch } = useTripMapData(tripId);
  const { geocodeAndCreate, loading: creating } = useGeocodeAndCreateLocation(tripId);
  const { remove, loading: deleting } = useDeleteTripLocation(tripId);
  const { calculate, loading: calculating } = useCalculateRoutes(tripId);

  // Handle place selection from autocomplete
  const handlePlaceSelect = async (result: PlaceAutocompleteResult) => {
    const location = await geocodeAndCreate({
      name: result.main_text,
      place_id: result.place_id,
      day_number: selectedDayNumber,
      location_type: selectedLocationType,
    });

    if (location) {
      refetch();
    }
  };

  // Handle location deletion
  const handleDeleteLocation = async (locationId: number) => {
    const success = await remove(locationId);
    if (success) {
      refetch();
    }
  };

  // Calculate routes between all locations
  const handleCalculateRoutes = async () => {
    const result = await calculate('driving');
    if (result) {
      refetch();
    }
  };

  // Get country filter from destination
  const countryFilter = destinationCountries?.[0];

  // Calculate total distance and duration
  const totalDistance = routes.reduce((sum, r) => sum + (r.distance_km || 0), 0);
  const totalDuration = routes.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`;
    }
    return `${mins}min`;
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-emerald-600" />
            Carte du circuit
          </CardTitle>
          {locations.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCalculateRoutes}
              disabled={calculating}
            >
              {calculating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Calculer les trajets
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add location section */}
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <LocationAutocomplete
                onSelect={handlePlaceSelect}
                placeholder="Rechercher un lieu (ex: Chiang Mai)..."
                countryFilter={countryFilter}
                disabled={creating}
              />
            </div>
          </div>

          {/* Location type selector */}
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(LOCATION_TYPE_LABELS) as TripLocationType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedLocationType(type)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  selectedLocationType === type
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
                style={{
                  backgroundColor: selectedLocationType === type ? MARKER_COLORS[type] : undefined,
                }}
              >
                {LOCATION_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Map placeholder */}
        <div className="relative rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 min-h-[300px] flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Chargement de la carte...</span>
            </div>
          ) : locations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <MapPin className="h-12 w-12 text-gray-300" />
              <span className="text-sm">Ajoutez des étapes pour afficher la carte</span>
            </div>
          ) : (
            <div className="absolute inset-0 p-4">
              {/* Simple visual representation of locations */}
              <div className="h-full flex flex-col justify-center">
                {locations.map((location, index) => {
                  const route = routes.find(r => r.from_location_id === location.id);
                  const isLast = index === locations.length - 1;

                  return (
                    <div key={location.id} className="relative">
                      {/* Location marker */}
                      <div className="flex items-center gap-3 py-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: MARKER_COLORS[location.location_type] }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {location.name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span>{LOCATION_TYPE_LABELS[location.location_type]}</span>
                            {location.day_number && (
                              <Badge variant="outline" className="text-xs">
                                J{location.day_number}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLocation(location.id)}
                          disabled={deleting}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Route to next location */}
                      {!isLast && route && (
                        <div className="ml-4 pl-6 py-1 border-l-2 border-dashed border-gray-300">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Navigation className="h-3 w-3" />
                            <span>{route.distance_km?.toFixed(0)} km</span>
                            <span>•</span>
                            <span>{route.duration_formatted || formatDuration(route.duration_minutes || 0)}</span>
                          </div>
                        </div>
                      )}
                      {!isLast && !route && (
                        <div className="ml-4 pl-6 py-1 border-l-2 border-dashed border-gray-300">
                          <div className="text-xs text-gray-400 italic">
                            Cliquez sur "Calculer les trajets"
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {routes.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
            <div className="text-sm text-emerald-700">
              <span className="font-medium">{locations.length} étapes</span>
              <span className="mx-2">•</span>
              <span>{totalDistance.toFixed(0)} km au total</span>
              <span className="mx-2">•</span>
              <span>{formatDuration(totalDuration)} de route</span>
            </div>
          </div>
        )}

        {/* Note about Google Maps */}
        <p className="text-xs text-gray-400">
          💡 La carte interactive avec Google Maps sera affichée ici une fois la clé API configurée.
        </p>
      </CardContent>
    </Card>
  );
}

export default TripMapEditor;
