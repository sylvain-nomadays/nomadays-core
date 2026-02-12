'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';

// ─────────────────────────────────────────────────────────────────────────────
// Formula Templates Hook — CRUD + save-as-template
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FormulaTemplateListItem {
  id: number;
  name: string;
  description_html?: string | null;
  block_type: string;
  template_category?: string | null;
  template_tags?: string[] | null;
  template_location_id?: number | null;
  template_country_code?: string | null;
  template_version: number;
  items_count: number;
  children_count: number;
  usage_count: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FormulaTemplateCreate {
  name: string;
  description_html?: string;
  block_type?: string;
  template_category?: string;
  template_tags?: string[];
  template_location_id?: number;
  template_country_code?: string;
}

export interface FormulaTemplateUpdate {
  name?: string;
  description_html?: string;
  template_category?: string;
  template_tags?: string[];
  template_location_id?: number;
  template_country_code?: string;
}

export interface FormulaTemplateUsageItem {
  formula_id: number;
  trip_id?: number | null;
  trip_name?: string | null;
  source_version?: number | null;
  template_version: number;
  status: 'in_sync' | 'template_updated';
}

export interface FormulaTemplateUsageResponse {
  template_id: number;
  template_version: number;
  usages: FormulaTemplateUsageItem[];
}

export interface FormulaTemplatesFilters {
  category?: string;
  country_code?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook for managing formula templates (reusable block templates).
 *
 * Provides:
 * - List/create/update/delete formula templates
 * - Save an existing formula as a template
 * - Get usage & sync status
 * - Propagate changes to linked formulas
 */
export function useFormulaTemplates(filters?: FormulaTemplatesFilters) {
  // ---- Fetch ----
  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.country_code) params.append('country_code', filters.country_code);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.page_size) params.append('page_size', String(filters.page_size));
    const qs = params.toString();
    return apiClient.get<FormulaTemplateListItem[]>(
      `/formula-templates${qs ? `?${qs}` : ''}`
    );
  }, [filters?.category, filters?.country_code, filters?.search, filters?.page, filters?.page_size]);

  const result = useApi(fetcher, {
    immediate: true,
    deps: [filters?.category, filters?.country_code, filters?.search, filters?.page],
  });

  // ---- Create ----
  const createMutation = useMutation(
    async (data: FormulaTemplateCreate) => {
      return apiClient.post<FormulaTemplateListItem>('/formula-templates', data);
    }
  );

  // ---- Update ----
  const updateMutation = useMutation(
    async ({ id, data }: { id: number; data: FormulaTemplateUpdate }) => {
      return apiClient.patch<FormulaTemplateListItem>(`/formula-templates/${id}`, data);
    }
  );

  // ---- Delete ----
  const deleteMutation = useMutation(
    async (id: number) => {
      return apiClient.delete(`/formula-templates/${id}`);
    }
  );

  // ---- Save as template ----
  const saveAsTemplateMutation = useMutation(
    async ({ formulaId, name, category }: { formulaId: number; name?: string; category?: string }) => {
      const params = new URLSearchParams();
      if (name) params.append('name', name);
      if (category) params.append('category', category);
      const qs = params.toString();
      return apiClient.post<FormulaTemplateListItem>(
        `/formula-templates/from-formula/${formulaId}${qs ? `?${qs}` : ''}`,
        {}
      );
    }
  );

  // ---- Get usage ----
  const getUsageMutation = useMutation(
    async (templateId: number) => {
      return apiClient.get<FormulaTemplateUsageResponse>(
        `/formula-templates/${templateId}/usage`
      );
    }
  );

  // ---- Propagate ----
  const propagateMutation = useMutation(
    async ({ templateId, formulaIds }: { templateId: number; formulaIds: number[] }) => {
      return apiClient.post<{ updated: number; errors: string[] }>(
        `/formula-templates/${templateId}/propagate`,
        { formula_ids: formulaIds }
      );
    }
  );

  return {
    templates: result.data || [],
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
    // Save as template
    saveAsTemplate: saveAsTemplateMutation.mutate,
    savingAsTemplate: saveAsTemplateMutation.loading,
    // Usage & sync
    getUsage: getUsageMutation.mutate,
    gettingUsage: getUsageMutation.loading,
    propagate: propagateMutation.mutate,
    propagating: propagateMutation.loading,
  };
}
