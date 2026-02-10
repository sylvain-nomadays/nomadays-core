'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi } from './useApi';

interface LocationItem {
  id: number;
  tenant_id: string;
  name: string;
  slug?: string;
  location_type: string;
  parent_id?: number | null;
  country_code?: string | null;
  lat?: number | null;
  lng?: number | null;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  accommodation_count: number;
}

interface LocationListResponse {
  items: LocationItem[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Hook to search locations by name.
 * Resolves a text like "Ayutthaya" to a location_id.
 * Uses GET /locations?search=...
 */
export function useLocationSearch(query: string | undefined) {
  const fetcher = useCallback(async () => {
    if (!query || query.trim().length < 2) return null;
    const params = new URLSearchParams({
      search: query.trim(),
      page_size: '5',
      is_active: 'true',
    });
    const response = await apiClient.get<LocationListResponse>(`/locations?${params.toString()}`);
    return response;
  }, [query]);

  const result = useApi(fetcher, { immediate: !!query && query.trim().length >= 2 });

  // Extract the first matching location_id for convenience
  const firstMatch = result.data?.items?.[0] ?? null;
  const resolvedLocationId = firstMatch?.id ?? null;

  return {
    ...result,
    locations: result.data?.items ?? [],
    resolvedLocationId,
    firstMatch,
  };
}
