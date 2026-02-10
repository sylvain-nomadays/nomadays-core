'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type {
  AccommodationExtra,
  CreateAccommodationExtraDTO,
  UpdateAccommodationExtraDTO,
} from '@/lib/api/types';

// ============================================================================
// Extras Hooks
// ============================================================================

/**
 * Hook to fetch extras for an accommodation
 */
export function useAccommodationExtras(accommodationId: number | null) {
  const fetcher = useCallback(async () => {
    if (!accommodationId) return [];
    return apiClient.get<AccommodationExtra[]>(`/accommodations/${accommodationId}/extras`);
  }, [accommodationId]);

  const { data, loading, error, refetch } = useApi<AccommodationExtra[]>(fetcher, {
    immediate: !!accommodationId,
    deps: [accommodationId],
  });

  return {
    extras: data || [],
    isLoading: loading,
    error,
    refetch,
  };
}

/**
 * Hook to create an extra
 */
export function useCreateAccommodationExtra() {
  return useMutation<AccommodationExtra, { accommodationId: number; data: CreateAccommodationExtraDTO }>(
    async ({ accommodationId, data }) => {
      return apiClient.post<AccommodationExtra>(
        `/accommodations/${accommodationId}/extras`,
        data
      );
    }
  );
}

/**
 * Hook to update an extra
 */
export function useUpdateAccommodationExtra() {
  return useMutation<AccommodationExtra, { accommodationId: number; extraId: number; data: UpdateAccommodationExtraDTO }>(
    async ({ accommodationId, extraId, data }) => {
      return apiClient.patch<AccommodationExtra>(
        `/accommodations/${accommodationId}/extras/${extraId}`,
        data
      );
    }
  );
}

/**
 * Hook to delete an extra
 */
export function useDeleteAccommodationExtra() {
  return useMutation<void, { accommodationId: number; extraId: number }>(
    async ({ accommodationId, extraId }) => {
      await apiClient.delete(`/accommodations/${accommodationId}/extras/${extraId}`);
    }
  );
}

/**
 * Combined hook for mutations (convenience hook)
 */
export function useAccommodationExtrasMutations(accommodationId: number | null) {
  const { mutate: createMutate, loading: isCreating } = useCreateAccommodationExtra();
  const { mutate: updateMutate, loading: isUpdating } = useUpdateAccommodationExtra();
  const { mutate: deleteMutate, loading: isDeleting } = useDeleteAccommodationExtra();

  const create = useCallback(
    async (data: CreateAccommodationExtraDTO) => {
      if (!accommodationId) return null;
      return createMutate({ accommodationId, data });
    },
    [accommodationId, createMutate]
  );

  const update = useCallback(
    async (extraId: number, data: UpdateAccommodationExtraDTO) => {
      if (!accommodationId) return null;
      return updateMutate({ accommodationId, extraId, data });
    },
    [accommodationId, updateMutate]
  );

  const remove = useCallback(
    async (extraId: number) => {
      if (!accommodationId) return;
      return deleteMutate({ accommodationId, extraId });
    },
    [accommodationId, deleteMutate]
  );

  return {
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
  };
}
