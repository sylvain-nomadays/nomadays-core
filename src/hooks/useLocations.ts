'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type {
  Location,
  LocationType,
  CreateLocationDTO,
  UpdateLocationDTO,
  PaginatedResponse,
  GeocodeResult,
  PlaceAutocompleteResult,
} from '@/lib/api/types';

// ============================================================================
// Hooks pour les Locations
// ============================================================================

interface LocationFilters {
  location_type?: LocationType;
  country_code?: string;
  parent_id?: number;
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

/**
 * Hook pour lister les locations avec filtres
 */
export function useLocations(filters: LocationFilters = {}) {
  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();

    if (filters.location_type) params.append('location_type', filters.location_type);
    if (filters.country_code) params.append('country_code', filters.country_code);
    if (filters.parent_id !== undefined) params.append('parent_id', String(filters.parent_id));
    if (filters.search) params.append('search', filters.search);
    if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));

    const query = params.toString();
    return apiClient.get<PaginatedResponse<Location>>(`/locations${query ? `?${query}` : ''}`);
  }, [filters.location_type, filters.country_code, filters.parent_id, filters.search, filters.is_active, filters.page, filters.page_size]);

  const result = useApi(fetcher);

  return {
    locations: result.data?.items || [],
    total: result.data?.total || 0,
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

/**
 * Hook pour lister les locations par pays
 */
export function useLocationsByCountry(countryCode: string | undefined, locationType?: LocationType) {
  const fetcher = useCallback(async () => {
    if (!countryCode) return [];
    const params = new URLSearchParams();
    if (locationType) params.append('location_type', locationType);
    const query = params.toString();
    return apiClient.get<Location[]>(`/locations/by-country/${countryCode}${query ? `?${query}` : ''}`);
  }, [countryCode, locationType]);

  return useApi(fetcher, { immediate: !!countryCode });
}

/**
 * Hook pour récupérer une location par ID
 */
export function useLocation(id: number | null) {
  const fetcher = useCallback(async () => {
    if (!id) throw new Error('Location ID is required');
    return apiClient.get<Location>(`/locations/${id}`);
  }, [id]);

  return useApi(fetcher, { immediate: !!id });
}

/**
 * Hook pour créer une location
 */
export function useCreateLocation() {
  const mutationFn = useCallback(async (data: CreateLocationDTO) => {
    return apiClient.post<Location>('/locations', data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook pour mettre à jour une location
 */
export function useUpdateLocation() {
  const mutationFn = useCallback(
    async ({ id, data }: { id: number; data: UpdateLocationDTO }) => {
      return apiClient.patch<Location>(`/locations/${id}`, data);
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook pour supprimer une location
 */
export function useDeleteLocation() {
  const mutationFn = useCallback(async (id: number) => {
    return apiClient.delete<void>(`/locations/${id}`);
  }, []);

  return useMutation(mutationFn);
}

// ============================================================================
// Hooks pour le Geocoding
// ============================================================================

/**
 * Hook pour géocoder et créer une location en une seule opération
 */
export function useGeocodeAndCreateLocation() {
  const mutationFn = useCallback(
    async (params: { name: string; place_id?: string; country_code?: string }) => {
      return apiClient.post<Location>('/locations/geocode-and-create', params);
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook pour géocoder un lieu (sans créer)
 */
export function useGeocodePlace() {
  const mutationFn = useCallback(
    async (params: { address?: string; place_id?: string }) => {
      const searchParams = new URLSearchParams();
      if (params.address) searchParams.append('address', params.address);
      if (params.place_id) searchParams.append('place_id', params.place_id);

      return apiClient.get<GeocodeResult>(`/locations/geocode?${searchParams.toString()}`);
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook pour l'autocomplete de lieux
 */
export function usePlacesAutocomplete() {
  const mutationFn = useCallback(
    async (params: { query: string; country?: string; types?: string }) => {
      const searchParams = new URLSearchParams();
      searchParams.append('query', params.query);
      if (params.country) searchParams.append('country', params.country);
      if (params.types) searchParams.append('types', params.types);

      return apiClient.get<PlaceAutocompleteResult[]>(
        `/locations/autocomplete?${searchParams.toString()}`
      );
    },
    []
  );

  return useMutation(mutationFn);
}

// ============================================================================
// Hooks pour la recherche rapide
// ============================================================================

/**
 * Hook pour rechercher des locations (pour les sélecteurs)
 */
export function useSearchLocations() {
  const mutationFn = useCallback(
    async (params: { query: string; country_code?: string; limit?: number }) => {
      const searchParams = new URLSearchParams();
      searchParams.append('query', params.query);
      if (params.country_code) searchParams.append('country_code', params.country_code);
      if (params.limit) searchParams.append('limit', String(params.limit));

      return apiClient.get<Location[]>(`/locations/search?${searchParams.toString()}`);
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook pour récupérer plusieurs locations par IDs
 */
export function useLocationsByIds(ids: number[]) {
  const fetcher = useCallback(async () => {
    if (ids.length === 0) return [];

    const searchParams = new URLSearchParams();
    ids.forEach(id => searchParams.append('ids', String(id)));

    return apiClient.get<Location[]>(`/locations/bulk?${searchParams.toString()}`);
  }, [ids]);

  return useApi(fetcher, { immediate: ids.length > 0 });
}
