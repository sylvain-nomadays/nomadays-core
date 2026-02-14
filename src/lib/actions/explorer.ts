'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { DestinationAgency } from '@/lib/types/explorer'

// ─── Supabase clients ────────────────────────────────────────────────────────

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
            // Server component context
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
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
}

// ─── Fetch all published destination agencies ────────────────────────────────

export async function fetchDestinationAgencies(): Promise<{
  data: DestinationAgency[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('destination_agencies' as any)
      .select('*')
      .eq('is_published', true)
      .order('continent', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[fetchDestinationAgencies] Error:', error)
      return { data: [], error: error.message }
    }

    return { data: (data || []) as unknown as DestinationAgency[], error: null }
  } catch (err) {
    console.error('[fetchDestinationAgencies] Unexpected error:', err)
    return { data: [], error: 'Erreur inattendue' }
  }
}

// ─── Contact agency host (creates dossier + redirects to voyage page) ────────

export async function contactAgencyHost(
  participantId: string,
  countryCode: string,
  agencyName: string,
): Promise<{ dossierId: string | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { dossierId: null, error: 'Non authentifie' }
    }

    const writeClient = createWriteClient()
    const code = countryCode.toUpperCase()

    // Check if a dossier already exists for this country + participant
    const { data: existingDossiers } = await writeClient
      .from('dossiers')
      .select('id, dossier_participants!inner(participant_id)')
      .contains('destination_countries', [code])
      .eq('dossier_participants.participant_id', participantId)
      .limit(1) as { data: any[] | null }

    if (existingDossiers && existingDossiers.length > 0) {
      // Already has a dossier for this country — redirect there
      revalidatePath('/client')
      return { dossierId: existingDossiers[0].id, error: null }
    }

    // Get country display name
    const displayName = new Intl.DisplayNames(['fr'], { type: 'region' }).of(code) || code

    // Create a new dossier (inquiry)
    const { data: dossier, error: dossierError } = await writeClient
      .from('dossiers')
      .insert({
        title: `Decouvrir ${displayName} avec ${agencyName}`,
        destination_countries: [code],
        status: 'lead',
        origin: 'website_b2c',
        trip_type: 'fit',
        language: 'FR',
        pax_adults: 2,
      } as any)
      .select('id')
      .single()

    if (dossierError || !dossier) {
      console.error('[contactAgencyHost] Dossier creation error:', dossierError)
      return { dossierId: null, error: 'Impossible de creer le dossier' }
    }

    // Link participant to dossier
    await writeClient
      .from('dossier_participants')
      .insert({
        dossier_id: dossier.id,
        participant_id: participantId,
        is_lead: true,
        participant_type: 'adult',
      })

    // Also create a wishlist entry for tracking (non-blocking)
    try {
      await supabase
        .from('traveler_wishlists' as any)
        .insert({
          participant_id: participantId,
          country_code: code,
          note: `Contact via Explorer - ${agencyName}`,
          desired_period: 'no_idea',
        })
    } catch {
      // Duplicate or error — not critical
    }

    revalidatePath('/client')
    return { dossierId: dossier.id, error: null }
  } catch (err) {
    console.error('[contactAgencyHost] Unexpected error:', err)
    return { dossierId: null, error: 'Erreur inattendue' }
  }
}

// ─── Start a new trip from dashboard dialog ─────────────────────────────────

export async function startNewTrip(
  participantId: string,
  countryCode: string,
  desiredPeriod?: string,
  note?: string,
): Promise<{ dossierId: string | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { dossierId: null, error: 'Non authentifie' }
    }

    const writeClient = createWriteClient()
    const code = countryCode.toUpperCase()

    // Check if a dossier already exists for this country + participant
    const { data: existingDossiers } = await writeClient
      .from('dossiers')
      .select('id, dossier_participants!inner(participant_id)')
      .contains('destination_countries', [code])
      .eq('dossier_participants.participant_id', participantId)
      .not('status', 'eq', 'lost')
      .limit(1) as { data: any[] | null }

    if (existingDossiers && existingDossiers.length > 0) {
      revalidatePath('/client')
      return { dossierId: existingDossiers[0].id, error: null }
    }

    const displayName = new Intl.DisplayNames(['fr'], { type: 'region' }).of(code) || code

    const { data: dossier, error: dossierError } = await writeClient
      .from('dossiers')
      .insert({
        title: `Decouvrir ${displayName}`,
        destination_countries: [code],
        status: 'lead',
        origin: 'website_b2c',
        trip_type: 'fit',
        language: 'FR',
        pax_adults: 2,
        notes: note || null,
      } as any)
      .select('id')
      .single()

    if (dossierError || !dossier) {
      console.error('[startNewTrip] Dossier creation error:', dossierError)
      return { dossierId: null, error: 'Impossible de creer le dossier' }
    }

    // Link participant
    await writeClient
      .from('dossier_participants')
      .insert({
        dossier_id: dossier.id,
        participant_id: participantId,
        is_lead: true,
        participant_type: 'adult',
      })

    // Also create wishlist entry for the map
    try {
      await supabase
        .from('traveler_wishlists' as any)
        .insert({
          participant_id: participantId,
          country_code: code,
          note: note || `Nouveau voyage - ${displayName}`,
          desired_period: desiredPeriod || 'no_idea',
        })
    } catch {
      // Duplicate — not critical
    }

    revalidatePath('/client')
    return { dossierId: dossier.id, error: null }
  } catch (err) {
    console.error('[startNewTrip] Unexpected error:', err)
    return { dossierId: null, error: 'Erreur inattendue' }
  }
}
