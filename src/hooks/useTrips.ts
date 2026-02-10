'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type { Trip, TripDay, TripPhoto, CreateTripDTO, UpdateTripDTO, PaginatedResponse, QuotationResult } from '@/lib/api/types';

interface TripsFilters {
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

/**
 * Hook to fetch trips list
 */
export function useTrips(filters: TripsFilters = {}) {
  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));

    const query = params.toString();
    const endpoint = `/trips${query ? `?${query}` : ''}`;
    return apiClient.get<PaginatedResponse<Trip>>(endpoint);
  }, [filters.type, filters.status, filters.search, filters.page, filters.page_size]);

  return useApi(fetcher);
}

/**
 * Hook to fetch a single trip
 */
export function useTrip(id: number | string | null) {
  const fetcher = useCallback(async () => {
    if (!id) throw new Error('Trip ID is required');
    return apiClient.get<Trip>(`/trips/${id}`);
  }, [id]);

  return useApi(fetcher, { immediate: !!id });
}

/**
 * Hook to create a trip
 */
export function useCreateTrip() {
  const mutationFn = useCallback(async (data: CreateTripDTO) => {
    return apiClient.post<Trip>('/trips', data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to update a trip
 */
export function useUpdateTrip() {
  const mutationFn = useCallback(async ({ id, data }: { id: number; data: UpdateTripDTO }) => {
    return apiClient.patch<Trip>(`/trips/${id}`, data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to delete a trip
 */
export function useDeleteTrip() {
  const mutationFn = useCallback(async (id: number) => {
    return apiClient.delete<void>(`/trips/${id}`);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to duplicate a trip
 */
export function useDuplicateTrip() {
  const mutationFn = useCallback(async (id: number) => {
    return apiClient.post<Trip>(`/trips/${id}/duplicate`);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to fetch photos for a trip (AI-generated day-by-day images)
 */
export function useTripPhotos(tripId: number | string | null) {
  const fetcher = useCallback(async () => {
    if (!tripId) throw new Error('Trip ID is required');
    return apiClient.get<TripPhoto[]>(`/trips/${tripId}/photos`);
  }, [tripId]);

  return useApi(fetcher, { immediate: !!tripId });
}

/**
 * Hook to upload a manual photo for a trip with full optimization pipeline.
 * Processes into 10 variants (5 sizes × AVIF + WebP) + LQIP + SEO nomenclature.
 */
export function useUploadTripPhoto() {
  const mutationFn = useCallback(async ({
    tripId,
    file,
    dayNumber,
    altText,
    caption,
    destination,
    attractionType,
    attractionSlug,
    seoFilename,
    isHero,
  }: {
    tripId: number;
    file: File;
    dayNumber?: number;
    altText?: string;
    caption?: string;
    destination?: string;
    attractionType?: string;
    attractionSlug?: string;
    seoFilename?: string;
    isHero?: boolean;
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (dayNumber !== undefined) formData.append('day_number', String(dayNumber));
    if (altText) formData.append('alt_text', altText);
    if (caption) formData.append('caption', caption);
    if (destination) formData.append('destination', destination);
    if (attractionType) formData.append('attraction_type', attractionType);
    if (attractionSlug) formData.append('attraction_slug', attractionSlug);
    if (seoFilename) formData.append('seo_filename', seoFilename);
    if (isHero) formData.append('is_hero', 'true');

    return apiClient.upload<TripPhoto>(`/trips/${tripId}/photos/upload`, formData);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to regenerate a trip photo with a new/edited prompt.
 * Calls POST /trips/{tripId}/photos/{photoId}/regenerate
 */
export function useRegenerateTripPhoto() {
  const mutationFn = useCallback(async ({
    tripId,
    photoId,
    prompt,
    negativePrompt,
    quality,
  }: {
    tripId: number;
    photoId: number;
    prompt?: string;
    negativePrompt?: string;
    quality?: 'high' | 'fast';
  }) => {
    return apiClient.post<TripPhoto>(`/trips/${tripId}/photos/${photoId}/regenerate`, {
      prompt: prompt || null,
      negative_prompt: negativePrompt || null,
      quality: quality || 'high',
    });
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to create a new trip day.
 * POST /trips/{tripId}/days
 */
export function useCreateTripDay() {
  const mutationFn = useCallback(async ({
    tripId,
    data,
  }: {
    tripId: number;
    data: { day_number?: number; day_number_end?: number; title?: string; description?: string; location_from?: string; location_to?: string };
  }) => {
    return apiClient.post<TripDay>(`/trips/${tripId}/days`, data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to update a trip day (title, description, multi-day range, etc.).
 * PATCH /trips/{tripId}/days/{dayId}
 */
export function useUpdateTripDay() {
  const mutationFn = useCallback(async ({
    tripId,
    dayId,
    data,
  }: {
    tripId: number;
    dayId: number;
    data: Partial<{ day_number: number; day_number_end: number | null; title: string; description: string; location_from: string; location_to: string; location_id: number | null; breakfast_included: boolean; lunch_included: boolean; dinner_included: boolean }>;
  }) => {
    return apiClient.patch<TripDay>(`/trips/${tripId}/days/${dayId}`, data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to extend or shrink a day block and renumber subsequent days atomically.
 * POST /trips/{tripId}/days/{dayId}/extend
 * delta: +1 to add a day, -1 to remove a day from the block
 */
export function useExtendTripDay() {
  const mutationFn = useCallback(async ({
    tripId,
    dayId,
    delta,
  }: {
    tripId: number;
    dayId: number;
    delta: number; // +1 or -1
  }) => {
    return apiClient.post<TripDay[]>(`/trips/${tripId}/days/${dayId}/extend`, { delta });
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to delete a trip day.
 * DELETE /trips/{tripId}/days/{dayId}
 */
export function useDeleteTripDay() {
  const mutationFn = useCallback(async ({
    tripId,
    dayId,
  }: {
    tripId: number;
    dayId: number;
  }) => {
    return apiClient.delete<void>(`/trips/${tripId}/days/${dayId}`);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to reorder trip days.
 * POST /trips/{tripId}/days/reorder
 * Renumbers day_number sequentially based on the new order.
 */
export function useReorderDays() {
  const mutationFn = useCallback(async ({
    tripId,
    dayIds,
  }: {
    tripId: number;
    dayIds: number[];
  }) => {
    return apiClient.post<TripDay[]>(`/trips/${tripId}/days/reorder`, {
      day_ids: dayIds,
    });
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to calculate quotation for a trip
 */
export function useCalculateQuotation() {
  const mutationFn = useCallback(async (tripId: number) => {
    return apiClient.post<QuotationResult>(`/quotation/calculate/${tripId}`);
  }, []);

  return useMutation(mutationFn);
}
