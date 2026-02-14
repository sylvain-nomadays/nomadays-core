'use client';

import { useCallback } from 'react';
import { useApi, useMutation } from './useApi';
import * as snippetsApi from '@/lib/api/cms-snippets';
import type { CmsSnippet, SnippetUpsertData, SnippetBatchItem } from '@/lib/api/cms-snippets';

// Re-export types for convenience
export type { CmsSnippet, SnippetUpsertData, SnippetBatchItem };

// ──────────────────────────────────────────────────────────────────────────────
// Query Hooks
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all snippets for a category (admin editor use).
 */
export function useSnippetsByCategory(category: string, includeGlobal = true) {
  const fetcher = useCallback(
    () => snippetsApi.fetchSnippetsByCategory(category, includeGlobal),
    [category, includeGlobal]
  );

  return useApi<CmsSnippet[]>(fetcher, {
    immediate: true,
    deps: [category, includeGlobal],
  });
}

/**
 * Resolve all snippets of a category with full metadata (cascade applied).
 */
export function useResolvedSnippets(category: string, lang = 'fr') {
  const fetcher = useCallback(
    () => snippetsApi.resolveSnippetsFull(category, lang),
    [category, lang]
  );

  return useApi<CmsSnippet[]>(fetcher, {
    immediate: true,
    deps: [category, lang],
  });
}

/**
 * Resolve specific snippet keys to their text content.
 */
export function useResolveSnippetValues(keys: string[], lang = 'fr') {
  const fetcher = useCallback(
    () => snippetsApi.resolveSnippets(keys, lang),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keys.join(','), lang]
  );

  return useApi<Record<string, string>>(fetcher, {
    immediate: keys.length > 0,
    deps: [keys.join(','), lang],
  });
}

/**
 * Fetch a single snippet by key.
 */
export function useSnippet(key: string) {
  const fetcher = useCallback(
    () => snippetsApi.fetchSnippet(key),
    [key]
  );

  return useApi<CmsSnippet>(fetcher, {
    immediate: !!key,
    deps: [key],
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Mutation Hooks
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Upsert a single snippet.
 */
export function useUpsertSnippet() {
  return useMutation(
    async ({ key, data }: { key: string; data: SnippetUpsertData }) => {
      return snippetsApi.upsertSnippet(key, data);
    }
  );
}

/**
 * Delete a snippet.
 */
export function useDeleteSnippet() {
  return useMutation(
    async (key: string) => {
      return snippetsApi.deleteSnippet(key);
    }
  );
}

/**
 * Batch upsert multiple snippets.
 */
export function useBatchUpsertSnippets() {
  return useMutation(
    async (snippets: SnippetBatchItem[]) => {
      return snippetsApi.batchUpsertSnippets(snippets);
    }
  );
}
