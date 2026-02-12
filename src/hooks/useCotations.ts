'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type {
  TripCotation,
  CreateCotationDTO,
  UpdateCotationDTO,
} from '@/lib/api/types';

// ─────────────────────────────────────────────────────────────────────────────
// Cotations Hook — CRUD + calculation for named quotation profiles
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for managing cotations (named quotation profiles) for a trip.
 *
 * Provides:
 * - List/create/update/delete cotations
 * - Calculate a single cotation or all cotations
 * - Regenerate pax configs
 */
export function useCotations(tripId: number | undefined) {
  // ---- Fetch ----
  const fetcher = useCallback(async () => {
    if (!tripId) return [];
    return apiClient.get<TripCotation[]>(`/cotations/trips/${tripId}`);
  }, [tripId]);

  const result = useApi(fetcher, { immediate: !!tripId, deps: [tripId] });

  // ---- Create ----
  const createMutation = useMutation(
    async (data: CreateCotationDTO) => {
      if (!tripId) throw new Error('No trip ID');
      return apiClient.post<TripCotation>(`/cotations/trips/${tripId}`, data);
    }
  );

  // ---- Update ----
  const updateMutation = useMutation(
    async ({ cotationId, data }: { cotationId: number; data: UpdateCotationDTO }) => {
      return apiClient.patch<TripCotation>(`/cotations/${cotationId}`, data);
    }
  );

  // ---- Delete ----
  const deleteMutation = useMutation(
    async (cotationId: number) => {
      return apiClient.delete(`/cotations/${cotationId}`);
    }
  );

  // ---- Calculate single ----
  const calculateMutation = useMutation(
    async (cotationId: number) => {
      return apiClient.post<TripCotation>(`/cotations/${cotationId}/calculate`, {});
    }
  );

  // ---- Calculate all ----
  const calculateAllMutation = useMutation<TripCotation[], void>(
    async () => {
      if (!tripId) throw new Error('No trip ID');
      return apiClient.post<TripCotation[]>(`/cotations/trips/${tripId}/calculate-all`, {});
    }
  );

  // ---- Regenerate pax configs ----
  const regeneratePaxMutation = useMutation(
    async (cotationId: number) => {
      return apiClient.post<TripCotation>(`/cotations/${cotationId}/regenerate-pax`, {});
    }
  );

  return {
    cotations: result.data || [],
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
    // CRUD
    create: createMutation.mutate,
    creating: createMutation.loading,
    update: updateMutation.mutate,
    updating: updateMutation.loading,
    remove: deleteMutation.mutate,
    removing: deleteMutation.loading,
    // Calculation
    calculate: calculateMutation.mutate,
    calculating: calculateMutation.loading,
    calculateAll: calculateAllMutation.mutate,
    calculatingAll: calculateAllMutation.loading,
    // Pax
    regeneratePax: regeneratePaxMutation.mutate,
    regeneratingPax: regeneratePaxMutation.loading,
  };
}
