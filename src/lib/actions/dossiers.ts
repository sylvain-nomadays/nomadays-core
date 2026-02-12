'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { DossierStatus, MarketingSource } from '@/lib/supabase/database.types'

// Create client for server actions (uses user session, subject to RLS)
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

// Create admin client using service_role key (bypasses RLS)
// Falls back to anon client if service_role key is not set
function createWriteClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    return createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  // Fallback: throw error — service key is required for write operations
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — cannot create write client')
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
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  } else {
    // By default, exclude archived
    query = query.neq('status', 'archived')
  }

  if (filters?.search) {
    query = query.or(`client_name.ilike.%${filters.search}%,reference.ilike.%${filters.search}%`)
  }

  if (filters?.advisorId) {
    query = query.eq('assigned_to_id', filters.advisorId)
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
    .select('*')
    .eq('is_hot', true)
    .not('status', 'in', '(completed,cancelled,archived,lost)')
    .order('last_activity_at', { ascending: false })
    .limit(10)

  // New leads (status = lead)
  const { data: newLeads } = await supabase
    .from('dossiers')
    .select('*')
    .eq('status', 'lead')
    .order('created_at', { ascending: false })
    .limit(10)

  // Inactive dossiers (no activity in 24h, in active statuses)
  const { data: inactiveDossiers } = await supabase
    .from('dossiers')
    .select('*')
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
  const supabase = await createWriteClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('dossiers') as any)
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

  // 1. Fetch dossier
  const { data, error } = await supabase
    .from('dossiers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching dossier:', JSON.stringify(error, null, 2))
    throw new Error(`Failed to fetch dossier: ${error.message}`)
  }

  // 2. Fetch participants separately (PostgREST join from dossiers fails)
  const { data: participants, error: partError } = await supabase
    .from('dossier_participants')
    .select(`
      id, is_lead, is_traveling, age_category, room_preference, room_share_with,
      participant:participants!dossier_participants_participant_id_fkey(id, first_name, last_name, email, phone, whatsapp, nationality, civility, birth_date, address, city, postal_code, country, passport_number, passport_expiry, dietary_requirements, medical_notes, notes, customer_status, has_portal_access, confirmed_trips_count)
    `)
    .eq('dossier_id', id)

  if (partError) {
    console.error('[getDossierById] Error fetching participants:', JSON.stringify(partError, null, 2))
  }

  return { ...data, participants: participants || [] }
}

export async function createDossier(dossierData: Record<string, unknown>) {
  const supabase = await createWriteClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dossier, error } = await (supabase.from('dossiers') as any)
    .insert(dossierData)
    .select()
    .single()

  if (error) {
    console.error('Error creating dossier:', JSON.stringify(error, null, 2))
    throw new Error(`Failed to create dossier: ${error.message} (code: ${error.code}, details: ${error.details})`)
  }

  // Auto-create lead participant from client info (uses same write client to bypass RLS)
  const clientName = (dossierData.client_name as string) || ''
  const clientEmail = (dossierData.client_email as string) || ''
  const clientPhone = (dossierData.client_phone as string) || ''

  if (clientName.trim()) {
    const nameParts = clientName.trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || firstName

    const participantEmail = clientEmail || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@noemail.local`
    console.log('[createDossier] Auto-creating participant:', { firstName, lastName, email: participantEmail, dossierId: dossier.id })

    try {
      // 1. Create participant record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: participant, error: pErr } = await (supabase.from('participants') as any)
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: participantEmail,
          phone: clientPhone || null,
        })
        .select('id')
        .single()

      console.log('[createDossier] Participant insert result:', { participant, error: pErr ? JSON.stringify(pErr) : null })

      if (pErr) {
        console.error('[createDossier] Auto-create participant FAILED:', JSON.stringify(pErr, null, 2))
      } else if (participant) {
        // 2. Link to dossier as lead
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: linkErr } = await (supabase.from('dossier_participants') as any)
          .insert({
            dossier_id: dossier.id,
            participant_id: participant.id,
            is_lead: true,
          })

        console.log('[createDossier] Link result:', { linkErr: linkErr ? JSON.stringify(linkErr) : null })

        if (linkErr) {
          console.error('[createDossier] Auto-link participant FAILED:', JSON.stringify(linkErr, null, 2))
        } else {
          console.log('[createDossier] Participant created and linked successfully!')
        }
      }
    } catch (e) {
      console.error('[createDossier] Auto-create participant EXCEPTION:', e)
      // Non-blocking: dossier is already created
    }
  }

  revalidatePath('/admin/dossiers')
  return dossier
}

export async function updateDossier(id: string, dossierData: Record<string, unknown>) {
  const supabase = await createWriteClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dossier, error } = await (supabase.from('dossiers') as any)
    .update(dossierData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating dossier:', JSON.stringify(error, null, 2), 'Data sent:', JSON.stringify(dossierData))
    throw new Error(`Failed to update dossier: ${error.message} (code: ${error.code})`)
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

  // Fetch dossiers, participants, and trips in parallel
  // (PostgREST join from dossiers → dossier_participants fails in this project)
  const [dossiersResult, participantsResult, tripsResult] = await Promise.all([
    supabase
      .from('dossiers')
      .select('*')
      .not('status', 'in', '(cancelled,archived,completed,lost)')
      .order('updated_at', { ascending: false }),
    supabase
      .from('dossier_participants')
      .select(`
        dossier_id, is_lead,
        participant:participants!dossier_participants_participant_id_fkey(phone, whatsapp, customer_status)
      `)
      .eq('is_lead', true),
    supabase
      .from('trips')
      .select('id, dossier_id'),
  ])

  if (dossiersResult.error) {
    console.error('Error fetching dossiers:', JSON.stringify(dossiersResult.error, null, 2))
    // Return empty object instead of crashing — table may not exist yet
    return {} as Record<DossierStatus, never[]>
  }

  // Build lookup maps for lead participants and trip counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadByDossier = new Map<string, any>()
  if (participantsResult.data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const dp of participantsResult.data as any[]) {
      if (dp.is_lead && dp.dossier_id) {
        leadByDossier.set(dp.dossier_id, dp.participant)
      }
    }
  }

  const tripsCountByDossier = new Map<string, number>()
  if (tripsResult.data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const t of tripsResult.data as any[]) {
      if (t.dossier_id) {
        tripsCountByDossier.set(t.dossier_id, (tripsCountByDossier.get(t.dossier_id) || 0) + 1)
      }
    }
  }

  // Enrich dossiers with lead participant info and trip count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = dossiersResult.data.map((d: any) => {
    const lead = leadByDossier.get(d.id)
    return {
      ...d,
      lead_phone: lead?.whatsapp || lead?.phone || null,
      lead_customer_status: lead?.customer_status || null,
      trips_count: tripsCountByDossier.get(d.id) || 0,
    }
  })

  // Group by status
  type EnrichedDossier = (typeof enriched)[number]
  const grouped = enriched.reduce(
    (acc, dossier) => {
      const status = dossier.status as DossierStatus
      if (!acc[status]) {
        acc[status] = []
      }
      acc[status].push(dossier)
      return acc
    },
    {} as Record<DossierStatus, EnrichedDossier[]>
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
