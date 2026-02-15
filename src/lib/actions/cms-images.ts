'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// ─── Supabase clients ─────────────────────────────────────────────────────────

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component
          }
        },
      },
    }
  )
}

function createWriteClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    return createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — cannot create write client')
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_BUCKET = 'documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]

// ─── Upload CMS image ────────────────────────────────────────────────────────

export async function uploadCmsImage(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    // Get tenant_id from user
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userData?.tenant_id) {
      return { success: false, error: 'Tenant non trouvé' }
    }

    const tenantId = userData.tenant_id

    // Get file
    const file = formData.get('file') as File | null
    const purpose = (formData.get('purpose') as string) || 'cms'

    if (!file) {
      return { success: false, error: 'Aucun fichier fourni' }
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { success: false, error: 'Formats acceptés : JPEG, PNG, WebP, AVIF' }
    }

    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'Le fichier ne doit pas dépasser 10 MB' }
    }

    // Write client (service_role) — needed for storage upload
    const writeClient = createWriteClient()

    // Build storage path: {tenant_id}/cms/{purpose}/{uuid}.{ext}
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileId = crypto.randomUUID()
    const storagePath = `${tenantId}/cms/${purpose}/${fileId}.${ext}`

    // Upload
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await writeClient.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[CMS Image Upload] Storage error:', uploadError)
      return { success: false, error: `Erreur upload: ${uploadError.message}` }
    }

    // Get public URL
    const { data: { publicUrl } } = writeClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    return { success: true, url: publicUrl }
  } catch (err) {
    console.error('[CMS Image Upload] Unexpected error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue' }
  }
}

// ─── Save CMS snippets (direct Supabase write — bypasses FastAPI backend) ────

export interface CmsSnippetInput {
  snippet_key: string
  category: string
  content_json: Record<string, string>
  metadata_json?: Record<string, unknown> | null
  is_active?: boolean
  sort_order?: number
}

export async function saveCmsSnippets(
  snippets: CmsSnippetInput[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    // Get tenant_id from user
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userData?.tenant_id) {
      return { success: false, error: 'Tenant non trouvé' }
    }

    const tenantId = userData.tenant_id
    const writeClient = createWriteClient()

    // Upsert each snippet
    for (const snippet of snippets) {
      // Check if snippet exists for this tenant
      const { data: existing } = await writeClient
        .from('cms_snippets')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('snippet_key', snippet.snippet_key)
        .maybeSingle()

      if (existing) {
        // Update
        const { error: updateError } = await writeClient
          .from('cms_snippets')
          .update({
            category: snippet.category,
            content_json: snippet.content_json,
            metadata_json: snippet.metadata_json ?? null,
            is_active: snippet.is_active ?? true,
            sort_order: snippet.sort_order ?? 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (updateError) {
          console.error('[saveCmsSnippets] Update error:', updateError)
          return { success: false, error: `Erreur mise à jour: ${updateError.message}` }
        }
      } else {
        // Insert
        const { error: insertError } = await writeClient
          .from('cms_snippets')
          .insert({
            tenant_id: tenantId,
            snippet_key: snippet.snippet_key,
            category: snippet.category,
            content_json: snippet.content_json,
            metadata_json: snippet.metadata_json ?? null,
            is_active: snippet.is_active ?? true,
            sort_order: snippet.sort_order ?? 0,
          })

        if (insertError) {
          console.error('[saveCmsSnippets] Insert error:', insertError)
          return { success: false, error: `Erreur insertion: ${insertError.message}` }
        }
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[saveCmsSnippets] Unexpected error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inattendue' }
  }
}

// ─── Load CMS snippets by category (direct Supabase read) ───────────────────

export interface CmsSnippetRow {
  id: string
  tenant_id: string | null
  snippet_key: string
  category: string
  content_json: Record<string, string>
  metadata_json: Record<string, unknown> | null
  is_active: boolean
  sort_order: number
}

export async function loadCmsSnippets(
  category: string
): Promise<CmsSnippetRow[]> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get tenant_id
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) return []

  const tenantId = userData.tenant_id

  const { data, error } = await supabase
    .from('cms_snippets')
    .select('*')
    .eq('category', category)
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error || !data) return []

  // Tenant-level overrides global — deduplicate by snippet_key
  const snippetMap = new Map<string, CmsSnippetRow>()
  for (const s of data) {
    const existing = snippetMap.get(s.snippet_key)
    if (!existing || (s.tenant_id !== null && existing.tenant_id === null)) {
      snippetMap.set(s.snippet_key, s as CmsSnippetRow)
    }
  }

  return Array.from(snippetMap.values()).sort((a, b) => a.sort_order - b.sort_order)
}

// ─── Resolve CMS image URLs (for SSR) ────────────────────────────────────────

export async function getCmsImageUrls(
  tenantId: string
): Promise<Record<string, string>> {
  // Use service_role client to bypass RLS — the voyageur (participant) is NOT
  // in the `users` table, so the RLS policy can't resolve their tenant_id.
  const supabase = createWriteClient()

  const { data, error } = await supabase
    .from('cms_snippets')
    .select('snippet_key, content_json, tenant_id')
    .eq('category', 'images')
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .eq('is_active', true)

  if (error || !data) return {}

  // Tenant-level snippets override global ones
  const result: Record<string, string> = {}
  // First pass: globals
  for (const s of data as any[]) {
    if (s.tenant_id === null) {
      const url = s.content_json?.fr || ''
      if (url) result[s.snippet_key] = url
    }
  }
  // Second pass: tenant-specific overrides
  for (const s of data as any[]) {
    if (s.tenant_id !== null) {
      const url = s.content_json?.fr || ''
      if (url) result[s.snippet_key] = url
    }
  }

  return result
}
