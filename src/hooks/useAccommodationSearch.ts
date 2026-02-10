'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi } from './useApi';
import type { Accommodation } from '@/lib/api/types';

interface AccommodationSearchFilters {
  location_id?: number | null;
  search?: string;
  status?: string;
  /** Increment to force re-fetch (e.g. after creating a new accommodation) */
  _refreshKey?: number;
}

/**
 * Hook to search accommodations for the hotel selector.
 * Unlike useAccommodations (which expects PaginatedResponse),
 * this hook correctly handles the backend's List response.
 */
export function useAccommodationSearch(filters: AccommodationSearchFilters) {
  const fetcher = useCallback(async () => {
    const query = new URLSearchParams();
    if (filters.location_id) query.append('location_id', String(filters.location_id));
    if (filters.search) query.append('search', filters.search);
    if (filters.status) query.append('status', filters.status);

    const queryString = query.toString();
    const endpoint = `/accommodations${queryString ? `?${queryString}` : ''}`;
    // Backend returns List[AccommodationResponse], not paginated
    return apiClient.get<Accommodation[]>(endpoint);
  }, [filters.location_id, filters.search, filters.status]);

  return useApi(fetcher, {
    immediate: true,
    deps: [filters.location_id, filters.search, filters.status, filters._refreshKey],
  });
}
