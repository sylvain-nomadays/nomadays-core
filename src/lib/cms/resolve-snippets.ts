/**
 * Server-side CMS snippet resolution.
 * Queries cms_snippets directly from Supabase for use in Server Components.
 *
 * Uses service_role client to bypass RLS — the voyageur (participant) is NOT
 * in the `users` table, so the RLS policy can't resolve their tenant_id.
 * This is safe because we only READ public CMS content, never write.
 *
 * Resolution cascade: tenant-specific → global (tenant_id IS NULL) → fallback.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — cannot resolve CMS snippets')
  }
  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface ResolvedSnippet {
  id: string
  snippet_key: string
  category: string
  content_json: Record<string, string>
  metadata_json: Record<string, unknown> | null
  sort_order: number
  is_active: boolean
  tenant_id: string | null
}

/**
 * Fetch all active snippets for a category with cascade resolution.
 * Returns resolved snippets sorted by sort_order.
 *
 * @param tenantId - If provided, fetches tenant-specific + global snippets.
 *                   If omitted, fetches ALL snippets (service_role bypasses RLS).
 */
export async function resolveSnippetsByCategory(
  category: string,
  lang = 'fr',
  tenantId?: string | null
): Promise<ResolvedSnippet[]> {
  const supabase = createServiceClient()

  // Build query — filter by tenant + globals if tenantId is provided
  let query = (supabase.from('cms_snippets') as any)
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (tenantId) {
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
  }

  const { data, error } = await query as { data: any[] | null; error: any }

  if (error || !data) {
    // Table cms_snippets may not exist yet — silently return empty
    if (error?.code !== '42P01') {
      console.warn('[resolveSnippetsByCategory]', error?.message || 'No data')
    }
    return []
  }

  // Group by snippet_key — tenant-specific overrides global
  const snippetMap = new Map<string, ResolvedSnippet>()

  for (const s of data) {
    const existing = snippetMap.get(s.snippet_key)

    // Tenant-specific always wins over global (null)
    if (!existing || (s.tenant_id !== null && existing.tenant_id === null)) {
      snippetMap.set(s.snippet_key, {
        id: s.id,
        snippet_key: s.snippet_key,
        category: s.category,
        content_json: s.content_json || {},
        metadata_json: s.metadata_json || null,
        sort_order: s.sort_order || 0,
        is_active: s.is_active,
        tenant_id: s.tenant_id,
      })
    }
  }

  return Array.from(snippetMap.values()).sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * Resolve specific snippet keys to their text values for a given language.
 * Returns a flat dict: { "key": "content in lang" }
 *
 * @param tenantId - If provided, fetches tenant-specific + global snippets.
 *                   If omitted, fetches ALL snippets (service_role bypasses RLS).
 */
export async function resolveSnippetValues(
  keys: string[],
  lang = 'fr',
  tenantId?: string | null
): Promise<Record<string, string>> {
  if (keys.length === 0) return {}

  const supabase = createServiceClient()

  let query = (supabase.from('cms_snippets') as any)
    .select('*')
    .in('snippet_key', keys)
    .eq('is_active', true)

  if (tenantId) {
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
  }

  const { data, error } = await query as { data: any[] | null; error: any }

  if (error || !data) {
    // Table cms_snippets may not exist yet — silently return empty
    if (error?.code !== '42P01') {
      console.warn('[resolveSnippetValues]', error?.message || 'No data')
    }
    return {}
  }

  // Group by snippet_key — tenant-specific overrides global
  const result: Record<string, string> = {}
  const tenantOverrides = new Set<string>()

  for (const s of data) {
    if (s.tenant_id !== null) {
      result[s.snippet_key] = s.content_json?.[lang] || ''
      tenantOverrides.add(s.snippet_key)
    } else if (!tenantOverrides.has(s.snippet_key)) {
      result[s.snippet_key] = s.content_json?.[lang] || ''
    }
  }

  return result
}
