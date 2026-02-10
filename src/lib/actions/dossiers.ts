'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { DossierStatus, MarketingSource } from '@/lib/supabase/database.types'

// Create client for server actions
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

export interface DossierFilters {
  status?: DossierStatus[]
  search?: string
  advisorId?: string
  language?: string
  marketingSource?: MarketingSource
  dateFrom?: string
  dateTo?: string
  isHot?: boolean
  limit?: number
  offset?: number
}

export async function getDossiers(filters?: DossierFilters) {
  const supabase = await createClient()

  let query = supabase
    .from('dossiers')
    .select(`
      *,
      advisor:users!dossiers_advisor_id_fkey(id, first_name, last_name, email, avatar_url),
      participants:dossier_participants(
        participant:participants(id, first_name, last_name, email),
        is_lead
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  } else {
    // By default, exclude archived
    query = query.neq('status', 'archived')
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,reference.ilike.%${filters.search}%`)
  }

  if (filters?.advisorId) {
    query = query.eq('advisor_id', filters.advisorId)
  }

  if (filters?.language) {
    query = query.eq('language', filters.language)
  }

  if (filters?.marketingSource) {
    query = query.eq('marketing_source', filters.marketingSource)
  }

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  if (filters?.isHot) {
    query = query.eq('is_hot', true)
  }

  // Pagination
  if (filters?.limit) {
    const offset = filters.offset || 0
    query = query.range(offset, offset + filters.limit - 1)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching dossiers:', error)
    throw new Error('Failed to fetch dossiers')
  }

  return { data, count }
}

// Get urgent dossiers (hot, new leads, inactive 24h+)
export async function getUrgentDossiers() {
  const supabase = await createClient()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Hot dossiers
  const { data: hotDossiers } = await supabase
    .from('dossiers')
    .select(`
      *,
      advisor:users!dossiers_advisor_id_fkey(id, first_name, last_name, avatar_url),
      participants:dossier_participants(
        participant:participants(id, first_name, last_name),
        is_lead
      )
    `)
    .eq('is_hot', true)
    .not('status', 'in', '(completed,cancelled,archived,lost,ignored)')
    .order('last_activity_at', { ascending: false })
    .limit(10)

  // New leads (status = lead)
  const { data: newLeads } = await supabase
    .from('dossiers')
    .select(`
      *,
      advisor:users!dossiers_advisor_id_fkey(id, first_name, last_name, avatar_url),
      participants:dossier_participants(
        participant:participants(id, first_name, last_name),
        is_lead
      )
    `)
    .eq('status', 'lead')
    .order('created_at', { ascending: false })
    .limit(10)

  // Inactive dossiers (no activity in 24h, in active statuses)
  const { data: inactiveDossiers } = await supabase
    .from('dossiers')
    .select(`
      *,
      advisor:users!dossiers_advisor_id_fkey(id, first_name, last_name, avatar_url),
      participants:dossier_participants(
        participant:participants(id, first_name, last_name),
        is_lead
      )
    `)
    .lt('last_activity_at', yesterday)
    .in('status', ['quote_in_progress', 'quote_sent', 'negotiation'])
    .eq('is_hot', false)
    .order('last_activity_at', { ascending: true })
    .limit(10)

  return {
    hot: hotDossiers || [],
    newLeads: newLeads || [],
    inactive: inactiveDossiers || [],
  }
}

// Toggle hot status
export async function toggleDossierHot(id: string, isHot: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('dossiers')
    .update({ is_hot: isHot })
    .eq('id', id)

  if (error) {
    console.error('Error toggling hot status:', error)
    throw new Error('Failed to update hot status')
  }

  revalidatePath('/admin/dossiers')
  revalidatePath(`/admin/dossiers/${id}`)
}

// Get advisors for filter dropdown
export async function getAdvisors() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, avatar_url')
    .in('role', ['dmc_manager', 'dmc_seller', 'admin_nomadays', 'support_nomadays'])
    .eq('is_active', true)
    .order('first_name')

  if (error) {
    console.error('Error fetching advisors:', error)
    return []
  }

  return data
}

export async function getDossierById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dossiers')
    .select(`
      *,
      tenant:tenants!dossiers_tenant_id_fkey(id, name, type),
      dmc:tenants!dossiers_dmc_id_fkey(id, name),
      advisor:users!dossiers_advisor_id_fkey(id, first_name, last_name, email, avatar_url),
      participants:dossier_participants(
        id,
        is_lead,
        room_preference,
        is_traveling,
        age_category,
        participant:participants(*)
      ),
      proposals(
        id, version, status, title, total_sell, currency, pax_count, price_per_person, sent_at, created_at
      ),
      events(
        id, event_type, actor_email, payload, created_at
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching dossier:', error)
    throw new Error('Failed to fetch dossier')
  }

  return data
}

export async function createDossier(dossierData: Record<string, unknown>) {
  const supabase = await createClient()

  const { data: dossier, error } = await supabase
    .from('dossiers')
    .insert(dossierData)
    .select()
    .single()

  if (error) {
    console.error('Error creating dossier:', error)
    throw new Error('Failed to create dossier')
  }

  revalidatePath('/admin/dossiers')
  return dossier
}

export async function updateDossier(id: string, dossierData: Record<string, unknown>) {
  const supabase = await createClient()

  const { data: dossier, error } = await supabase
    .from('dossiers')
    .update(dossierData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating dossier:', error)
    throw new Error('Failed to update dossier')
  }

  revalidatePath('/admin/dossiers')
  revalidatePath(`/admin/dossiers/${id}`)
  return dossier
}

export async function updateDossierStatus(id: string, status: DossierStatus) {
  return updateDossier(id, { status })
}

export async function getDossiersGroupedByStatus() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dossiers')
    .select(`
      *,
      dmc:tenants!dossiers_dmc_id_fkey(id, name),
      advisor:users!dossiers_advisor_id_fkey(id, first_name, last_name),
      participants:dossier_participants(
        participant:participants(id, first_name, last_name),
        is_lead
      )
    `)
    .not('status', 'in', '(cancelled,archived,completed,in_trip,lost,ignored)')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching dossiers:', error)
    // Return empty object instead of crashing — table may not exist yet
    return {} as Record<DossierStatus, never[]>
  }

  // Group by status
  type DossierData = (typeof data)[number]
  const grouped = data.reduce(
    (acc, dossier) => {
      const status = dossier.status as DossierStatus
      if (!acc[status]) {
        acc[status] = []
      }
      acc[status].push(dossier)
      return acc
    },
    {} as Record<DossierStatus, DossierData[]>
  )

  return grouped
}

export async function getPipelineStats() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dossiers')
    .select('status, id')
    .not('status', 'in', '(cancelled,archived)')

  if (error) {
    console.error('Error fetching pipeline stats:', error)
    // Return empty stats instead of crashing — table may not exist yet
    return { total: 0 } as Record<string, number>
  }

  const stats: Record<string, number> = { total: 0 }
  for (const d of data) {
    const status = d.status as string
    stats[status] = (stats[status] || 0) + 1
    stats.total = (stats.total || 0) + 1
  }

  return stats
}
