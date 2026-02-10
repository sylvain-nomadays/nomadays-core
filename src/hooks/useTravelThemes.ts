'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type { TravelTheme } from '@/lib/api/types';

interface TravelThemeListResponse {
  items: TravelTheme[];
  total: number;
}

/**
 * Hook to fetch travel themes list.
 * Themes are fixed (12 pre-defined) and auto-seeded on first access.
 */
export function useTravelThemes() {
  const fetcher = useCallback(async () => {
    return apiClient.get<TravelThemeListResponse>('/travel-themes');
  }, []);

  const result = useApi(fetcher);

  return {
    themes: result.data?.items || [],
    total: result.data?.total || 0,
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

/**
 * Hook to seed default themes (admin only, used for initial setup)
 */
export function useSeedDefaultThemes() {
  const mutationFn = useCallback(async () => {
    return apiClient.post<TravelThemeListResponse>('/travel-themes/seed-defaults', {});
  }, []);

  return useMutation(mutationFn);
}
