'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type { Formula } from '@/lib/api/types';

/**
 * Hook to manage transversal (trip-level) formulas.
 * These are formulas linked directly to a trip, not to a specific day.
 * Examples: Guide, Chauffeur, Repas récurrents, Allowances, Budget Cadeau, etc.
 */
export function useTransversalFormulas(tripId: number | undefined) {
  const fetcher = useCallback(async () => {
    if (!tripId) return [];
    return apiClient.get<Formula[]>(`/trip-structure/trips/${tripId}/services`);
  }, [tripId]);

  const result = useApi(fetcher, { immediate: !!tripId, deps: [tripId] });

  const createMutation = useMutation(
    async (data: {
      name: string;
      description_html?: string;
      service_day_start?: number | null;
      service_day_end?: number | null;
      sort_order?: number;
      block_type?: string;
    }) => {
      if (!tripId) throw new Error('No trip ID');
      return apiClient.post<Formula>(`/trip-structure/trips/${tripId}/services`, data);
    }
  );

  const updateMutation = useMutation(
    async ({ formulaId, data }: {
      formulaId: number;
      data: {
        name?: string;
        description_html?: string;
        service_day_start?: number | null;
        service_day_end?: number | null;
        sort_order?: number;
        block_type?: string;
      };
    }) => {
      if (!tripId) throw new Error('No trip ID');
      return apiClient.patch<Formula>(
        `/trip-structure/trips/${tripId}/services/${formulaId}`,
        data
      );
    }
  );

  const deleteMutation = useMutation(
    async (formulaId: number) => {
      if (!tripId) throw new Error('No trip ID');
      return apiClient.delete(`/trip-structure/trips/${tripId}/services/${formulaId}`);
    }
  );

  return {
    formulas: result.data || [],
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
    create: createMutation.mutate,
    creating: createMutation.loading,
    update: updateMutation.mutate,
    updating: updateMutation.loading,
    remove: deleteMutation.mutate,
    removing: deleteMutation.loading,
  };
}
