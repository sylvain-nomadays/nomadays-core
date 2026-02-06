'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type {
  TravelTheme,
  CreateTravelThemeDTO,
  UpdateTravelThemeDTO,
} from '@/lib/api/types';

interface TravelThemeListResponse {
  items: TravelTheme[];
  total: number;
}

/**
 * Hook to fetch travel themes list
 */
export function useTravelThemes(includeInactive = false) {
  const fetcher = useCallback(async () => {
    const params = includeInactive ? '?include_inactive=true' : '';
    return apiClient.get<TravelThemeListResponse>(`/travel-themes${params}`);
  }, [includeInactive]);

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
 * Hook to fetch a single travel theme
 */
export function useTravelTheme(id: number | null) {
  const fetcher = useCallback(async () => {
    if (!id) throw new Error('Theme ID is required');
    return apiClient.get<TravelTheme>(`/travel-themes/${id}`);
  }, [id]);

  return useApi(fetcher, { immediate: !!id });
}

/**
 * Hook to create a travel theme
 */
export function useCreateTravelTheme() {
  const mutationFn = useCallback(async (data: CreateTravelThemeDTO) => {
    return apiClient.post<TravelTheme>('/travel-themes', data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to update a travel theme
 */
export function useUpdateTravelTheme() {
  const mutationFn = useCallback(async ({
    id,
    data,
  }: {
    id: number;
    data: UpdateTravelThemeDTO;
  }) => {
    return apiClient.patch<TravelTheme>(`/travel-themes/${id}`, data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to delete a travel theme
 */
export function useDeleteTravelTheme() {
  const mutationFn = useCallback(async (id: number) => {
    return apiClient.delete<void>(`/travel-themes/${id}`);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to seed default themes for tenant
 */
export function useSeedDefaultThemes() {
  const mutationFn = useCallback(async () => {
    return apiClient.post<TravelThemeListResponse>('/travel-themes/seed-defaults', {});
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to reorder themes
 */
export function useReorderThemes() {
  const mutationFn = useCallback(async (themeIds: number[]) => {
    return apiClient.post<TravelThemeListResponse>('/travel-themes/reorder', {
      theme_ids: themeIds,
    });
  }, []);

  return useMutation(mutationFn);
}
