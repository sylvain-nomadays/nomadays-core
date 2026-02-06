'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type {
  Accommodation,
  CreateAccommodationDTO,
  UpdateAccommodationDTO,
  RoomCategory,
  CreateRoomCategoryDTO,
  UpdateRoomCategoryDTO,
  AccommodationSeason,
  CreateAccommodationSeasonDTO,
  UpdateAccommodationSeasonDTO,
  RoomRate,
  CreateRoomRateDTO,
  UpdateRoomRateDTO,
  AccommodationPhoto,
  PaginatedResponse,
  AccommodationStatus,
  AvailabilitySearchParams,
  AvailabilityResult,
} from '@/lib/api/types';
import type { StayRateRequest, StayRateResult, AccommodationFilters } from '@/lib/api/accommodations';

// ============================================================================
// Accommodation Hooks
// ============================================================================

/**
 * Hook to fetch accommodations list
 */
export function useAccommodations(filters: AccommodationFilters = {}) {
  const fetcher = useCallback(async () => {
    const query = new URLSearchParams();
    if (filters.supplier_id) query.append('supplier_id', String(filters.supplier_id));
    if (filters.location_id) query.append('location_id', String(filters.location_id));
    if (filters.country_code) query.append('country_code', filters.country_code);
    if (filters.status) query.append('status', filters.status);
    if (filters.star_rating_min) query.append('star_rating_min', String(filters.star_rating_min));
    if (filters.star_rating_max) query.append('star_rating_max', String(filters.star_rating_max));
    if (filters.external_provider) query.append('external_provider', filters.external_provider);
    if (filters.search) query.append('search', filters.search);
    if (filters.page) query.append('page', String(filters.page));
    if (filters.page_size) query.append('page_size', String(filters.page_size));

    const queryString = query.toString();
    const endpoint = `/accommodations${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<PaginatedResponse<Accommodation>>(endpoint);
  }, [
    filters.supplier_id,
    filters.location_id,
    filters.country_code,
    filters.status,
    filters.star_rating_min,
    filters.star_rating_max,
    filters.external_provider,
    filters.search,
    filters.page,
    filters.page_size,
  ]);

  return useApi(fetcher);
}

/**
 * Hook to fetch a single accommodation
 */
export function useAccommodation(id: number | null) {
  const fetcher = useCallback(async () => {
    if (!id) throw new Error('Accommodation ID is required');
    return apiClient.get<Accommodation>(`/accommodations/${id}`);
  }, [id]);

  return useApi(fetcher, { immediate: !!id });
}

/**
 * Hook to fetch accommodation by supplier ID
 */
export function useAccommodationBySupplier(supplierId: number | null) {
  const fetcher = useCallback(async () => {
    if (!supplierId) throw new Error('Supplier ID is required');
    return apiClient.get<Accommodation>(`/suppliers/${supplierId}/accommodation`);
  }, [supplierId]);

  return useApi(fetcher, { immediate: !!supplierId });
}

/**
 * Hook to create an accommodation
 */
export function useCreateAccommodation() {
  const mutationFn = useCallback(async (data: CreateAccommodationDTO) => {
    return apiClient.post<Accommodation>('/accommodations', data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to update an accommodation
 */
export function useUpdateAccommodation() {
  const mutationFn = useCallback(
    async ({ id, data }: { id: number; data: UpdateAccommodationDTO }) => {
      return apiClient.patch<Accommodation>(`/accommodations/${id}`, data);
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to delete an accommodation
 */
export function useDeleteAccommodation() {
  const mutationFn = useCallback(async (id: number) => {
    return apiClient.delete<void>(`/accommodations/${id}`);
  }, []);

  return useMutation(mutationFn);
}

// ============================================================================
// Room Category Hooks
// ============================================================================

/**
 * Hook to fetch room categories for an accommodation
 */
export function useRoomCategories(accommodationId: number | null) {
  const fetcher = useCallback(async () => {
    if (!accommodationId) throw new Error('Accommodation ID is required');
    return apiClient.get<RoomCategory[]>(`/accommodations/${accommodationId}/room-categories`);
  }, [accommodationId]);

  return useApi(fetcher, { immediate: !!accommodationId });
}

/**
 * Hook to fetch a single room category
 */
export function useRoomCategory(accommodationId: number | null, categoryId: number | null) {
  const fetcher = useCallback(async () => {
    if (!accommodationId || !categoryId) throw new Error('IDs are required');
    return apiClient.get<RoomCategory>(
      `/accommodations/${accommodationId}/room-categories/${categoryId}`
    );
  }, [accommodationId, categoryId]);

  return useApi(fetcher, { immediate: !!accommodationId && !!categoryId });
}

/**
 * Hook to create a room category
 */
export function useCreateRoomCategory() {
  const mutationFn = useCallback(async (data: CreateRoomCategoryDTO) => {
    return apiClient.post<RoomCategory>(
      `/accommodations/${data.accommodation_id}/room-categories`,
      data
    );
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to update a room category
 */
export function useUpdateRoomCategory() {
  const mutationFn = useCallback(
    async ({
      accommodationId,
      categoryId,
      data,
    }: {
      accommodationId: number;
      categoryId: number;
      data: UpdateRoomCategoryDTO;
    }) => {
      return apiClient.patch<RoomCategory>(
        `/accommodations/${accommodationId}/room-categories/${categoryId}`,
        data
      );
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to delete a room category
 */
export function useDeleteRoomCategory() {
  const mutationFn = useCallback(
    async ({ accommodationId, categoryId }: { accommodationId: number; categoryId: number }) => {
      return apiClient.delete<void>(
        `/accommodations/${accommodationId}/room-categories/${categoryId}`
      );
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to reorder room categories
 */
export function useReorderRoomCategories() {
  const mutationFn = useCallback(
    async ({
      accommodationId,
      categoryIds,
    }: {
      accommodationId: number;
      categoryIds: number[];
    }) => {
      return apiClient.post<void>(
        `/accommodations/${accommodationId}/room-categories/reorder`,
        { category_ids: categoryIds }
      );
    },
    []
  );

  return useMutation(mutationFn);
}

// ============================================================================
// Season Hooks
// ============================================================================

/**
 * Hook to fetch seasons for an accommodation
 */
export function useAccommodationSeasons(accommodationId: number | null) {
  const fetcher = useCallback(async () => {
    if (!accommodationId) throw new Error('Accommodation ID is required');
    return apiClient.get<AccommodationSeason[]>(`/accommodations/${accommodationId}/seasons`);
  }, [accommodationId]);

  return useApi(fetcher, { immediate: !!accommodationId });
}

/**
 * Hook to create a season
 */
export function useCreateAccommodationSeason() {
  const mutationFn = useCallback(async (data: CreateAccommodationSeasonDTO) => {
    return apiClient.post<AccommodationSeason>(
      `/accommodations/${data.accommodation_id}/seasons`,
      data
    );
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to update a season
 */
export function useUpdateAccommodationSeason() {
  const mutationFn = useCallback(
    async ({
      accommodationId,
      seasonId,
      data,
    }: {
      accommodationId: number;
      seasonId: number;
      data: UpdateAccommodationSeasonDTO;
    }) => {
      return apiClient.patch<AccommodationSeason>(
        `/accommodations/${accommodationId}/seasons/${seasonId}`,
        data
      );
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to delete a season
 */
export function useDeleteAccommodationSeason() {
  const mutationFn = useCallback(
    async ({ accommodationId, seasonId }: { accommodationId: number; seasonId: number }) => {
      return apiClient.delete<void>(`/accommodations/${accommodationId}/seasons/${seasonId}`);
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to get applicable season for a date
 */
export function useSeasonForDate(accommodationId: number | null, date: string | null) {
  const fetcher = useCallback(async () => {
    if (!accommodationId || !date) throw new Error('Accommodation ID and date are required');
    return apiClient.get<AccommodationSeason>(
      `/accommodations/${accommodationId}/seasons/for-date?date=${date}`
    );
  }, [accommodationId, date]);

  return useApi(fetcher, { immediate: !!accommodationId && !!date });
}

// ============================================================================
// Room Rate Hooks
// ============================================================================

/**
 * Hook to fetch room rates for an accommodation
 */
export function useRoomRates(
  accommodationId: number | null,
  params?: {
    room_category_id?: number;
    season_id?: number;
    bed_type?: string;
  }
) {
  const fetcher = useCallback(async () => {
    if (!accommodationId) throw new Error('Accommodation ID is required');

    const query = new URLSearchParams();
    if (params?.room_category_id) query.append('room_category_id', String(params.room_category_id));
    if (params?.season_id) query.append('season_id', String(params.season_id));
    if (params?.bed_type) query.append('bed_type', params.bed_type);

    const queryString = query.toString();
    const endpoint = `/accommodations/${accommodationId}/rates${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<RoomRate[]>(endpoint);
  }, [accommodationId, params?.room_category_id, params?.season_id, params?.bed_type]);

  return useApi(fetcher, { immediate: !!accommodationId });
}

/**
 * Hook to create a room rate
 */
export function useCreateRoomRate() {
  const mutationFn = useCallback(async (data: CreateRoomRateDTO) => {
    return apiClient.post<RoomRate>(`/accommodations/${data.accommodation_id}/rates`, data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to update a room rate
 */
export function useUpdateRoomRate() {
  const mutationFn = useCallback(
    async ({
      accommodationId,
      rateId,
      data,
    }: {
      accommodationId: number;
      rateId: number;
      data: UpdateRoomRateDTO;
    }) => {
      return apiClient.patch<RoomRate>(
        `/accommodations/${accommodationId}/rates/${rateId}`,
        data
      );
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to delete a room rate
 */
export function useDeleteRoomRate() {
  const mutationFn = useCallback(
    async ({ accommodationId, rateId }: { accommodationId: number; rateId: number }) => {
      return apiClient.delete<void>(`/accommodations/${accommodationId}/rates/${rateId}`);
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to bulk upsert rates
 */
export function useBulkUpsertRates() {
  const mutationFn = useCallback(
    async ({
      accommodationId,
      rates,
    }: {
      accommodationId: number;
      rates: CreateRoomRateDTO[];
    }) => {
      return apiClient.post<RoomRate[]>(`/accommodations/${accommodationId}/rates/bulk`, {
        rates,
      });
    },
    []
  );

  return useMutation(mutationFn);
}

// ============================================================================
// Photo Hooks
// ============================================================================

/**
 * Hook to fetch photos for an accommodation
 */
export function useAccommodationPhotos(accommodationId: number | null, roomCategoryId?: number) {
  const fetcher = useCallback(async () => {
    if (!accommodationId) throw new Error('Accommodation ID is required');
    const query = roomCategoryId ? `?room_category_id=${roomCategoryId}` : '';
    return apiClient.get<AccommodationPhoto[]>(
      `/accommodations/${accommodationId}/photos${query}`
    );
  }, [accommodationId, roomCategoryId]);

  return useApi(fetcher, { immediate: !!accommodationId });
}

/**
 * Hook to upload a photo
 */
export function useUploadAccommodationPhoto() {
  const mutationFn = useCallback(
    async ({
      accommodationId,
      file,
      options,
    }: {
      accommodationId: number;
      file: File;
      options?: {
        room_category_id?: number;
        caption?: string;
        is_main?: boolean;
      };
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (options?.room_category_id) {
        formData.append('room_category_id', String(options.room_category_id));
      }
      if (options?.caption) formData.append('caption', options.caption);
      if (options?.is_main !== undefined) formData.append('is_main', String(options.is_main));

      return apiClient.upload<AccommodationPhoto>(
        `/accommodations/${accommodationId}/photos`,
        formData
      );
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to update photo metadata
 */
export function useUpdateAccommodationPhoto() {
  const mutationFn = useCallback(
    async ({
      accommodationId,
      photoId,
      data,
    }: {
      accommodationId: number;
      photoId: number;
      data: {
        caption?: string;
        is_main?: boolean;
        sort_order?: number;
      };
    }) => {
      return apiClient.patch<AccommodationPhoto>(
        `/accommodations/${accommodationId}/photos/${photoId}`,
        data
      );
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to delete a photo
 */
export function useDeleteAccommodationPhoto() {
  const mutationFn = useCallback(
    async ({ accommodationId, photoId }: { accommodationId: number; photoId: number }) => {
      return apiClient.delete<void>(`/accommodations/${accommodationId}/photos/${photoId}`);
    },
    []
  );

  return useMutation(mutationFn);
}

// ============================================================================
// External Availability Hooks
// ============================================================================

/**
 * Hook to search external availability
 */
export function useSearchExternalAvailability() {
  const mutationFn = useCallback(async (params: AvailabilitySearchParams) => {
    return apiClient.post<AvailabilityResult[]>('/accommodations/availability/search', params);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to get accommodation availability (compare contract vs external)
 */
export function useAccommodationAvailability() {
  const mutationFn = useCallback(
    async ({
      accommodationId,
      params,
    }: {
      accommodationId: number;
      params: Omit<AvailabilitySearchParams, 'accommodation_id' | 'location_id'>;
    }) => {
      return apiClient.post<AvailabilityResult>(
        `/accommodations/${accommodationId}/availability`,
        params
      );
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to sync from external provider
 */
export function useSyncFromExternalProvider() {
  const mutationFn = useCallback(async (accommodationId: number) => {
    return apiClient.post<Accommodation>(`/accommodations/${accommodationId}/sync`, {});
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to link to external provider
 */
export function useLinkToExternalProvider() {
  const mutationFn = useCallback(
    async ({
      accommodationId,
      provider,
      externalId,
    }: {
      accommodationId: number;
      provider: 'ratehawk' | 'hotelbeds' | 'amadeus';
      externalId: string;
    }) => {
      return apiClient.post<Accommodation>(
        `/accommodations/${accommodationId}/link-external`,
        { provider, external_id: externalId }
      );
    },
    []
  );

  return useMutation(mutationFn);
}

// ============================================================================
// Rate Calculation Hooks (for quotation engine)
// ============================================================================

/**
 * Hook to calculate rate for a complete stay
 */
export function useCalculateStayRate() {
  const mutationFn = useCallback(async (params: StayRateRequest) => {
    return apiClient.post<StayRateResult>('/accommodations/calculate-stay', params);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to calculate rates for multiple room configurations
 */
export function useCalculateMultiRoomStay() {
  const mutationFn = useCallback(
    async ({
      accommodationId,
      params,
    }: {
      accommodationId: number;
      params: {
        check_in: string;
        check_out: string;
        rooms: {
          room_category_id: number;
          bed_type: string;
          occupancy: {
            adults: number;
            children?: number;
            children_ages?: number[];
          };
        }[];
        meal_plan?: string;
      };
    }) => {
      return apiClient.post<{
        rooms: StayRateResult[];
        total_cost: number;
        currency: string;
      }>(`/accommodations/${accommodationId}/calculate-multi-room`, params);
    },
    []
  );

  return useMutation(mutationFn);
}
