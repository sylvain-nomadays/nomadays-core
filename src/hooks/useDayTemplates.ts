'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type { FormulaResponse } from '@/lib/api/types';

// ─────────────────────────────────────────────────────────────────────────────
// Day Templates Hook — CRUD + insert-to-day
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DayTemplateListItem {
  id: number;
  title?: string | null;
  description?: string | null;
  day_number: number;
  location_from?: string | null;
  location_to?: string | null;
  template_version: number;
  template_tags?: string[] | null;
  formulas_count: number;
  breakfast_included: boolean;
  lunch_included: boolean;
  dinner_included: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DayTemplateDetail extends DayTemplateListItem {
  formulas: FormulaResponse[];
}

export interface DayTemplateCreate {
  title: string;
  description?: string;
  location_from?: string;
  location_to?: string;
  location_id?: number;
  template_tags?: string[];
  breakfast_included?: boolean;
  lunch_included?: boolean;
  dinner_included?: boolean;
}

export interface DayTemplateUpdate {
  title?: string;
  description?: string;
  location_from?: string;
  location_to?: string;
  location_id?: number;
  template_tags?: string[];
  breakfast_included?: boolean;
  lunch_included?: boolean;
  dinner_included?: boolean;
}

export interface DayTemplatesFilters {
  search?: string;
  page?: number;
  page_size?: number;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook for managing day templates (reusable day structures with multiple blocks).
 *
 * Provides:
 * - List/create/update/delete day templates
 * - Insert all blocks from a day template into a circuit day
 */
export function useDayTemplates(filters?: DayTemplatesFilters) {
  // ---- Fetch ----
  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.page_size) params.append('page_size', String(filters.page_size));
    const qs = params.toString();
    return apiClient.get<DayTemplateListItem[]>(
      `/day-templates${qs ? `?${qs}` : ''}`
    );
  }, [filters?.search, filters?.page, filters?.page_size]);

  const result = useApi(fetcher, {
    immediate: true,
    deps: [filters?.search, filters?.page],
  });

  // ---- Get detail ----
  const getDetailMutation = useMutation(
    async (id: number) => {
      return apiClient.get<DayTemplateDetail>(`/day-templates/${id}`);
    }
  );

  // ---- Create ----
  const createMutation = useMutation(
    async (data: DayTemplateCreate) => {
      return apiClient.post<DayTemplateListItem>('/day-templates', data);
    }
  );

  // ---- Update ----
  const updateMutation = useMutation(
    async ({ id, data }: { id: number; data: DayTemplateUpdate }) => {
      return apiClient.patch<DayTemplateListItem>(`/day-templates/${id}`, data);
    }
  );

  // ---- Delete ----
  const deleteMutation = useMutation(
    async (id: number) => {
      return apiClient.delete(`/day-templates/${id}`);
    }
  );

  // ---- Insert into circuit day ----
  const insertToDayMutation = useMutation(
    async ({ templateId, targetDayId }: { templateId: number; targetDayId: number }) => {
      return apiClient.post<FormulaResponse[]>(
        `/day-templates/${templateId}/insert-to/${targetDayId}`,
        {}
      );
    }
  );

  return {
    dayTemplates: result.data || [],
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
    // Detail
    getDetail: getDetailMutation.mutate,
    gettingDetail: getDetailMutation.loading,
    // CRUD
    create: createMutation.mutate,
    creating: createMutation.loading,
    update: updateMutation.mutate,
    updating: updateMutation.loading,
    remove: deleteMutation.mutate,
    removing: deleteMutation.loading,
    // Insert
    insertToDay: insertToDayMutation.mutate,
    insertingToDay: insertToDayMutation.loading,
  };
}
