'use client';

import { useCallback, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';

export interface Language {
  code: string;
  name: string;
}

export interface TranslationInfo {
  id: number;
  name: string;
  language: string;
  language_name: string;
  is_original: boolean;
  status: string;
}

export interface TranslationsResponse {
  original_id: number;
  translations: TranslationInfo[];
}

export interface TranslateResult {
  id: number;
  name: string;
  language: string;
  source_trip_id: number;
  message: string;
}

// ========== Preview Types ==========

export interface TranslatedDay {
  day_number: number;
  title?: string;
  description?: string;
}

export interface TranslationContent {
  name?: string;
  description_short?: string;
  highlights?: Array<{ title: string; icon?: string }>;
  inclusions?: Array<{ text: string; default?: boolean }>;
  exclusions?: Array<{ text: string; default?: boolean }>;
  info_general?: string;
  info_formalities?: string;
  info_booking_conditions?: string;
  info_cancellation_policy?: string;
  info_additional?: string;
  days?: TranslatedDay[];
}

export interface CacheMetadata {
  cached_at?: string;
  cache_age_minutes: number;
  is_stale: boolean;
  stale_reason?: string;
  exists: boolean;
}

export interface PreviewResponse {
  trip_id: number;
  language: string;
  language_name: string;
  language_flag: string;
  content: TranslationContent;
  cache_metadata: CacheMetadata;
}

export interface LanguageStatus {
  code: string;
  name: string;
  flag: string;
  has_cache: boolean;
  is_stale: boolean;
  cached_at?: string;
  has_independent_copy: boolean;
  independent_copy_id?: number;
}

export interface LanguagesResponse {
  trip_id: number;
  source_language: string;
  languages: LanguageStatus[];
}

/**
 * Hook to fetch available languages
 */
export function useLanguages() {
  const fetcher = useCallback(async () => {
    return apiClient.get<{ languages: Language[] }>('/translate/languages');
  }, []);

  return useApi(fetcher);
}

/**
 * Hook to fetch translations for a trip
 */
export function useTripTranslations(tripId: number | string | null) {
  const fetcher = useCallback(async () => {
    if (!tripId) throw new Error('Trip ID is required');
    return apiClient.get<TranslationsResponse>(`/translate/${tripId}/translations`);
  }, [tripId]);

  return useApi(fetcher, { immediate: !!tripId });
}

/**
 * Hook to translate a trip (create independent copy)
 */
export function useTranslateTrip() {
  const mutationFn = useCallback(async ({ tripId, targetLanguage }: { tripId: number; targetLanguage: string }) => {
    return apiClient.post<TranslateResult>(`/translate/${tripId}/translate`, {
      target_language: targetLanguage,
    });
  }, []);

  return useMutation(mutationFn);
}

// ========== Push Translation Types ==========

export interface PushTranslationResult {
  trip_id: number;
  language: string;
  success: boolean;
  message: string;
}

export interface PushTranslationResponse {
  source_trip_id: number;
  results: PushTranslationResult[];
}

/**
 * Hook to push translation updates to other versions
 */
export function usePushTranslation() {
  const mutationFn = useCallback(async ({ tripId, targetTripIds }: { tripId: number; targetTripIds: number[] }) => {
    return apiClient.post<PushTranslationResponse>(`/translate/${tripId}/push`, {
      target_trip_ids: targetTripIds,
    });
  }, []);

  return useMutation(mutationFn);
}

// ========== Preview Hooks ==========

/**
 * Hook to fetch language status for a trip (caches and independent copies)
 */
export function useTripLanguages(tripId: number | string | null) {
  const fetcher = useCallback(async () => {
    if (!tripId) throw new Error('Trip ID is required');
    return apiClient.get<LanguagesResponse>(`/trips/${tripId}/languages`);
  }, [tripId]);

  return useApi(fetcher, { immediate: !!tripId });
}

/**
 * Hook to preview a trip in a specific language (with caching)
 */
export function useTranslationPreview(tripId: number | string | null) {
  const [previewLanguage, setPreviewLanguage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const fetchPreview = useCallback(async (language: string, forceRefresh = false) => {
    if (!tripId) return;

    setIsLoading(true);
    setError(null);
    setPreviewLanguage(language);

    try {
      const endpoint = forceRefresh
        ? `/trips/${tripId}/preview/${language}/refresh`
        : `/trips/${tripId}/preview/${language}`;

      const response = forceRefresh
        ? await apiClient.post<PreviewResponse>(endpoint, {})
        : await apiClient.get<PreviewResponse>(endpoint);

      setPreview(response);
    } catch (err) {
      const errorMessage = (err as { detail?: string })?.detail || 'Erreur lors de la traduction';
      setError(errorMessage);
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  const clearPreview = useCallback(() => {
    setPreviewLanguage(null);
    setPreview(null);
    setError(null);
  }, []);

  const refreshPreview = useCallback(async () => {
    if (previewLanguage) {
      await fetchPreview(previewLanguage, true);
    }
  }, [previewLanguage, fetchPreview]);

  return {
    previewLanguage,
    preview,
    isLoading,
    error,
    fetchPreview,
    refreshPreview,
    clearPreview,
  };
}
