/**
 * API module for CMS Snippets — lightweight editable UI content.
 * Used by admin editors (FAQ, widgets) and client space (resolved content).
 */

import { apiClient } from './client';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface CmsSnippet {
  id: string;
  tenant_id: string | null;
  snippet_key: string;
  category: string;
  content_json: Record<string, string>;
  metadata_json: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
}

export interface SnippetUpsertData {
  category: string;
  content_json: Record<string, string>;
  metadata_json?: Record<string, unknown> | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface SnippetBatchItem {
  snippet_key: string;
  category: string;
  content_json: Record<string, string>;
  metadata_json?: Record<string, unknown> | null;
  is_active?: boolean;
  sort_order?: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// API Functions
// ──────────────────────────────────────────────────────────────────────────────

const BASE = '/cms/snippets';

/**
 * List snippets by category for the current tenant.
 */
export async function fetchSnippetsByCategory(
  category: string,
  includeGlobal = false
): Promise<CmsSnippet[]> {
  const params = new URLSearchParams({ category });
  if (includeGlobal) params.append('include_global', 'true');
  return apiClient.get(`${BASE}?${params}`);
}

/**
 * Get a single snippet by key (with tenant→global cascade).
 */
export async function fetchSnippet(key: string): Promise<CmsSnippet> {
  return apiClient.get(`${BASE}/${encodeURIComponent(key)}`);
}

/**
 * Resolve multiple snippets to their content value for a given language.
 * Returns a flat dict: { "key": "content in lang" }
 */
export async function resolveSnippets(
  keys: string[],
  lang = 'fr'
): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const params = new URLSearchParams({
    keys: keys.join(','),
    lang,
  });
  return apiClient.get(`${BASE}/resolve?${params}`);
}

/**
 * Resolve all snippets of a category with full metadata.
 */
export async function resolveSnippetsFull(
  category: string,
  lang = 'fr'
): Promise<CmsSnippet[]> {
  const params = new URLSearchParams({ category, lang });
  return apiClient.get(`${BASE}/resolve-full?${params}`);
}

/**
 * Create or update a snippet for the current tenant.
 */
export async function upsertSnippet(
  key: string,
  data: SnippetUpsertData
): Promise<CmsSnippet> {
  return apiClient.put(`${BASE}/${encodeURIComponent(key)}`, data);
}

/**
 * Delete a snippet for the current tenant.
 */
export async function deleteSnippet(key: string): Promise<void> {
  return apiClient.delete(`${BASE}/${encodeURIComponent(key)}`);
}

/**
 * Batch create/update multiple snippets for the current tenant.
 */
export async function batchUpsertSnippets(
  snippets: SnippetBatchItem[]
): Promise<CmsSnippet[]> {
  return apiClient.post(`${BASE}/batch`, { snippets });
}
