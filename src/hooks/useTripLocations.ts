'use client';

import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import {
  getTripLocations,
  createTripLocation,
  geocodeAndCreateLocation,
  updateTripLocation,
  deleteTripLocation,
  calculateRoutes,
  getTripMapData,
  placesAutocomplete,
  geocodePlace,
} from '@/lib/api/trip-locations';
import type {
  TripLocation,
  CreateTripLocationDTO,
  UpdateTripLocationDTO,
  TripMapData,
  PlaceAutocompleteResult,
  GeocodeResult,
  TravelMode,
} from '@/lib/api/types';

/**
 * Hook for managing trip locations
 */
export function useTripLocations(tripId: number) {
  const fetcher = useCallback(() => getTripLocations(tripId), [tripId]);
  const result = useApi(fetcher);

  return {
    locations: result.data || [],
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

/**
 * Hook for getting complete map data (locations + routes)
 */
export function useTripMapData(tripId: number) {
  const fetcher = useCallback(() => getTripMapData(tripId), [tripId]);
  const result = useApi(fetcher);

  return {
    mapData: result.data as TripMapData | null,
    locations: result.data?.locations || [],
    routes: result.data?.routes || [],
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

/**
 * Hook for creating a location
 */
export function useCreateTripLocation(tripId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = async (data: CreateTripLocationDTO): Promise<TripLocation | null> => {
    setLoading(true);
    setError(null);
    try {
      const location = await createTripLocation(tripId, data);
      return location;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create location'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}

/**
 * Hook for geocoding and creating a location in one call.
 * This is the main hook for the "type Chiang Mai → add to map" flow.
 */
export function useGeocodeAndCreateLocation(tripId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const geocodeAndCreate = async (params: {
    name: string;
    place_id?: string;
    day_number?: number;
    location_type?: string;
  }): Promise<TripLocation | null> => {
    setLoading(true);
    setError(null);
    try {
      const location = await geocodeAndCreateLocation(tripId, params);
      return location;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to geocode and create location'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { geocodeAndCreate, loading, error };
}

/**
 * Hook for updating a location
 */
export function useUpdateTripLocation(tripId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = async (
    locationId: number,
    data: UpdateTripLocationDTO
  ): Promise<TripLocation | null> => {
    setLoading(true);
    setError(null);
    try {
      const location = await updateTripLocation(tripId, locationId, data);
      return location;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update location'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { update, loading, error };
}

/**
 * Hook for deleting a location
 */
export function useDeleteTripLocation(tripId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = async (locationId: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await deleteTripLocation(tripId, locationId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete location'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { remove, loading, error };
}

/**
 * Hook for calculating routes between locations
 */
export function useCalculateRoutes(tripId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const calculate = async (travelMode: TravelMode = 'driving') => {
    setLoading(true);
    setError(null);
    try {
      const routes = await calculateRoutes(tripId, travelMode);
      return routes;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to calculate routes'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { calculate, loading, error };
}

/**
 * Hook for places autocomplete (search locations by name)
 */
export function usePlacesAutocomplete() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<PlaceAutocompleteResult[]>([]);

  const search = async (query: string, country?: string): Promise<PlaceAutocompleteResult[]> => {
    if (!query || query.length < 2) {
      setResults([]);
      return [];
    }

    setLoading(true);
    setError(null);
    try {
      const data = await placesAutocomplete({ query, country });
      setResults(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to search places'));
      setResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const clear = () => setResults([]);

  return { search, results, clear, loading, error };
}

/**
 * Hook for geocoding a place
 */
export function useGeocodePlace() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const geocode = async (params: {
    place_id?: string;
    address?: string;
  }): Promise<GeocodeResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await geocodePlace(params);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to geocode place'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { geocode, loading, error };
}
