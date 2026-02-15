'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TravelInfoItem {
  key: string
  label: string
  emoji?: string
  content: string
}

export interface TravelInfoCategory {
  key: string
  label: string
  icon: string
  items: TravelInfoItem[]
}

export interface ChecklistEntry {
  category_key: string
  item_key: string
  is_checked: boolean
  notes: string | null
}

// ─── getCountryTravelInfo ────────────────────────────────────────────────────

export async function getCountryTravelInfo(
  countryCode: string,
  tenantId: string
): Promise<{ categories: TravelInfoCategory[]; status: string } | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('country_travel_info')
    .select('categories, status')
    .eq('country_code', countryCode)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) return null

  return {
    categories: (data.categories as TravelInfoCategory[]) || [],
    status: data.status as string,
  }
}

// ─── getDossierTravelOverlay ─────────────────────────────────────────────────

export async function getDossierTravelOverlay(
  dossierId: string,
  countryCode: string
): Promise<{
  categories: TravelInfoCategory[]
  startDate: string | null
  endDate: string | null
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dossier_travel_info_overlay')
    .select('categories, start_date, end_date')
    .eq('dossier_id', dossierId)
    .eq('country_code', countryCode)
    .single()

  if (error || !data) return null

  return {
    categories: (data.categories as TravelInfoCategory[]) || [],
    startDate: data.start_date,
    endDate: data.end_date,
  }
}

// ─── getMergedTravelInfo ─────────────────────────────────────────────────────

export async function getMergedTravelInfo(input: {
  dossierId: string
  countryCode: string
  tenantId: string
}): Promise<TravelInfoCategory[]> {
  const [countryInfo, overlay] = await Promise.all([
    getCountryTravelInfo(input.countryCode, input.tenantId),
    getDossierTravelOverlay(input.dossierId, input.countryCode),
  ])

  const baseCategories = countryInfo?.categories || []
  const overlayCategories = overlay?.categories || []

  // Merge: base categories + overlay categories (weather comes from overlay)
  return [...baseCategories, ...overlayCategories]
}

// ─── getParticipantChecklist ─────────────────────────────────────────────────

export async function getParticipantChecklist(
  dossierId: string,
  participantId: string
): Promise<ChecklistEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('travel_info_checklist')
    .select('category_key, item_key, is_checked, notes')
    .eq('dossier_id', dossierId)
    .eq('participant_id', participantId)

  if (error || !data) return []

  return data as ChecklistEntry[]
}

// ─── toggleChecklistItem ─────────────────────────────────────────────────────

export async function toggleChecklistItem(input: {
  dossierId: string
  participantId: string
  categoryKey: string
  itemKey: string
}): Promise<boolean> {
  const writeClient = createWriteClient()

  // Check if entry exists
  const { data: existing } = await (writeClient.from('travel_info_checklist') as any)
    .select('id, is_checked')
    .eq('dossier_id', input.dossierId)
    .eq('participant_id', input.participantId)
    .eq('category_key', input.categoryKey)
    .eq('item_key', input.itemKey)
    .single()

  if (existing) {
    // Toggle
    const newChecked = !existing.is_checked
    await (writeClient.from('travel_info_checklist') as any)
      .update({ is_checked: newChecked, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    return newChecked
  } else {
    // Create new entry (checked)
    await (writeClient.from('travel_info_checklist') as any)
      .insert({
        dossier_id: input.dossierId,
        participant_id: input.participantId,
        category_key: input.categoryKey,
        item_key: input.itemKey,
        is_checked: true,
      })
    return true
  }
}

// ─── updateChecklistNotes ────────────────────────────────────────────────────

export async function updateChecklistNotes(input: {
  dossierId: string
  participantId: string
  categoryKey: string
  itemKey: string
  notes: string
}): Promise<void> {
  const writeClient = createWriteClient()

  // Upsert: create or update
  await (writeClient.from('travel_info_checklist') as any)
    .upsert(
      {
        dossier_id: input.dossierId,
        participant_id: input.participantId,
        category_key: input.categoryKey,
        item_key: input.itemKey,
        notes: input.notes || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'dossier_id,participant_id,category_key,item_key',
      }
    )

  revalidatePath(`/client/voyages/${input.dossierId}`)
}

// ─── Admin: list all country travel info ────────────────────────────────────

export interface CountryTravelInfoRow {
  id: string
  tenant_id: string
  country_code: string
  categories: TravelInfoCategory[]
  status: string
  model: string | null
  generated_at: string | null
  reviewed_at: string | null
  version: number
  created_at: string
  updated_at: string
}

export async function listCountryTravelInfo(
  tenantId: string
): Promise<CountryTravelInfoRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('country_travel_info')
    .select('id, tenant_id, country_code, categories, status, model, generated_at, reviewed_at, version, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .order('country_code', { ascending: true })

  if (error || !data) return []

  return data as CountryTravelInfoRow[]
}

// ─── Admin: update country travel info categories ───────────────────────────

export async function updateCountryTravelInfo(input: {
  id: string
  categories: TravelInfoCategory[]
  status?: string
}): Promise<{ success: boolean; error?: string }> {
  const writeClient = createWriteClient()

  const updateData: any = {
    categories: input.categories,
    updated_at: new Date().toISOString(),
  }

  if (input.status) {
    updateData.status = input.status
    if (input.status === 'approved' || input.status === 'published') {
      updateData.reviewed_at = new Date().toISOString()
    }
  }

  const { error } = await (writeClient.from('country_travel_info') as any)
    .update(updateData)
    .eq('id', input.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/content/client/travel-info')
  return { success: true }
}
