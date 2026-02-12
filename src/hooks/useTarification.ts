'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useMutation } from './useApi';
import type {
  TarificationData,
  TarificationComputeResult,
  TripCotation,
} from '@/lib/api/types';

// ============================================================================
// Tarification Hook — Save & compute reverse margin analysis
// ============================================================================

/**
 * Hook for managing tarification (pricing) on a cotation.
 *
 * Provides:
 * - save: PATCH /cotations/{id}/tarification — persist pricing entries
 * - compute: POST /cotations/{id}/tarification/compute — calculate margins
 */
export function useTarification() {
  // ---- Save tarification ----
  const saveMutation = useMutation(
    useCallback(
      async ({ cotationId, data }: { cotationId: number; data: TarificationData }) => {
        const payload: Record<string, unknown> = { mode: data.mode, entries: data.entries };
        if (data.validity_date) payload.validity_date = data.validity_date;
        return apiClient.patch<TripCotation>(
          `/cotations/${cotationId}/tarification`,
          payload
        );
      },
      []
    )
  );

  // ---- Compute tarification ----
  const computeMutation = useMutation(
    useCallback(
      async ({ cotationId, data }: { cotationId: number; data: TarificationData }) => {
        return apiClient.post<TarificationComputeResult>(
          `/cotations/${cotationId}/tarification/compute`,
          { mode: data.mode, entries: data.entries }
        );
      },
      []
    )
  );

  return {
    // Save
    save: saveMutation.mutate,
    saving: saveMutation.loading,
    saveError: saveMutation.error,
    // Compute
    compute: computeMutation.mutate,
    computing: computeMutation.loading,
    computeResult: computeMutation.data,
    computeError: computeMutation.error,
    resetCompute: computeMutation.reset,
  };
}
