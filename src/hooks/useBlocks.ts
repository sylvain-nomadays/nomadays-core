'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type { Formula, BlockType } from '@/lib/api/types';

/**
 * Fetch blocks (structured tree) for a trip day.
 * Returns only top-level blocks with nested children.
 */
export function useDayBlocks(dayId: number | null) {
  const fetcher = useCallback(async () => {
    if (!dayId) throw new Error('Day ID required');
    return apiClient.get<Formula[]>(`/trip-structure/days/${dayId}/blocks`);
  }, [dayId]);

  return useApi(fetcher, { immediate: !!dayId });
}

/**
 * Create a new block (text, activity, or accommodation) in a day.
 */
export function useCreateBlock() {
  const mutationFn = useCallback(async ({
    dayId,
    name,
    blockType,
    descriptionHtml,
    sortOrder,
    parentBlockId,
    conditionId,
  }: {
    dayId: number;
    name: string;
    blockType: BlockType;
    descriptionHtml?: string;
    sortOrder?: number;
    parentBlockId?: number;
    conditionId?: number | null;
  }) => {
    return apiClient.post<Formula>(`/trip-structure/days/${dayId}/formulas`, {
      name,
      block_type: blockType,
      description_html: descriptionHtml || null,
      sort_order: sortOrder ?? 0,
      parent_block_id: parentBlockId || null,
      condition_id: conditionId || null,
    });
  }, []);

  return useMutation(mutationFn);
}

/**
 * Reorder blocks within a day.
 */
export function useReorderBlocks() {
  const mutationFn = useCallback(async ({
    dayId,
    blockIds,
  }: {
    dayId: number;
    blockIds: number[];
  }) => {
    return apiClient.patch<{ status: string }>(`/trip-structure/days/${dayId}/blocks/reorder`, {
      block_ids: blockIds,
    });
  }, []);

  return useMutation(mutationFn);
}

/**
 * Move a block (and its children) to another day.
 */
export function useMoveBlock() {
  const mutationFn = useCallback(async ({
    formulaId,
    targetDayId,
    sortOrder,
  }: {
    formulaId: number;
    targetDayId: number;
    sortOrder?: number;
  }) => {
    return apiClient.patch<{ status: string }>(`/trip-structure/formulas/${formulaId}/move`, {
      target_day_id: targetDayId,
      sort_order: sortOrder ?? 0,
    });
  }, []);

  return useMutation(mutationFn);
}

/**
 * Update a block (formula) — delegates to the existing PATCH /formulas/{id} endpoint.
 */
export function useUpdateBlock() {
  const mutationFn = useCallback(async ({
    formulaId,
    data,
  }: {
    formulaId: number;
    data: Partial<{
      name: string;
      description_html: string;
      block_type: BlockType;
      sort_order: number;
      condition_id: number | null;
    }>;
  }) => {
    return apiClient.patch<Formula>(`/trip-structure/formulas/${formulaId}`, data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Delete a block (formula) — delegates to the existing DELETE /formulas/{id} endpoint.
 */
export function useDeleteBlock() {
  const mutationFn = useCallback(async (formulaId: number) => {
    return apiClient.delete<void>(`/trip-structure/formulas/${formulaId}`);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Duplicate a block (with children and items) to a target day.
 * Cross-trip is allowed (e.g. copying from a template to a circuit).
 */
export function useDuplicateBlock() {
  const mutationFn = useCallback(async ({
    formulaId,
    targetDayId,
    sortOrder,
  }: {
    formulaId: number;
    targetDayId: number;
    sortOrder?: number;
  }) => {
    return apiClient.post<Formula>(`/trip-structure/formulas/${formulaId}/duplicate`, {
      target_day_id: targetDayId,
      sort_order: sortOrder ?? 0,
    });
  }, []);

  return useMutation(mutationFn);
}

/**
 * Copy all blocks from a source day to a target day.
 * Used for importing an entire day from a template or another circuit.
 */
export function useCopyDayBlocks() {
  const mutationFn = useCallback(async ({
    sourceDayId,
    targetDayId,
  }: {
    sourceDayId: number;
    targetDayId: number;
  }) => {
    return apiClient.post<Formula[]>(`/trip-structure/days/${sourceDayId}/copy-blocks`, {
      target_day_id: targetDayId,
    });
  }, []);

  return useMutation(mutationFn);
}
