'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// ─── Supabase clients (same pattern as lib/actions/dossiers.ts) ──────────────

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

// ─── Add a traveler wishlist entry ───────────────────────────────────────────

export async function addTravelerWish(
  participantId: string,
  countryCode: string,
  note?: string,
  desiredPeriod?: string,
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Verify the user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'Non authentifié' }
    }

    // Insert wish (RLS will verify participant belongs to user)
    const { data, error } = await supabase
      .from('traveler_wishlists' as any)
      .insert({
        participant_id: participantId,
        country_code: countryCode.toUpperCase(),
        note: note || null,
        desired_period: desiredPeriod || 'no_idea',
      })
      .select()
      .single()

    if (error) {
      console.error('[addTravelerWish] Error:', error)
      if (error.code === '23505') {
        return { data: null, error: 'Vous avez déjà une envie pour ce pays' }
      }
      return { data: null, error: error.message }
    }

    revalidatePath('/client')
    return { data, error: null }
  } catch (err) {
    console.error('[addTravelerWish] Unexpected error:', err)
    return { data: null, error: 'Erreur inattendue' }
  }
}

// ─── Delete a traveler wishlist entry ────────────────────────────────────────

export async function deleteTravelerWish(
  wishId: string,
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Non authentifié' }
    }

    const { error } = await supabase
      .from('traveler_wishlists' as any)
      .delete()
      .eq('id', wishId)

    if (error) {
      console.error('[deleteTravelerWish] Error:', error)
      return { error: error.message }
    }

    revalidatePath('/client')
    return { error: null }
  } catch (err) {
    console.error('[deleteTravelerWish] Unexpected error:', err)
    return { error: 'Erreur inattendue' }
  }
}

// ─── Convert a wish to a dossier inquiry (uses service_role) ─────────────────

export async function convertWishToInquiry(
  wishId: string,
  participantId: string,
  countryCode: string,
): Promise<{ dossierId: string | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { dossierId: null, error: 'Non authentifié' }
    }

    // Use write client (service_role) to create a dossier
    const writeClient = createWriteClient()

    // Get participant info for the dossier
    const { data: participant } = await writeClient
      .from('participants')
      .select('id, first_name, last_name, email')
      .eq('id', participantId)
      .single()

    if (!participant) {
      return { dossierId: null, error: 'Participant non trouvé' }
    }

    const countryName = new Intl.DisplayNames(['fr'], { type: 'region' }).of(countryCode) || countryCode

    // Create the dossier
    const { data: dossier, error: dossierError } = await writeClient
      .from('dossiers')
      .insert({
        title: `Envie : ${countryName}`,
        destination_countries: [countryCode.toUpperCase()],
        status: 'lead',
        origin: 'website_b2c',
        trip_type: 'fit',
        language: 'FR',
        pax_adults: 2,
      } as any)
      .select('id')
      .single()

    if (dossierError || !dossier) {
      console.error('[convertWishToInquiry] Dossier creation error:', dossierError)
      return { dossierId: null, error: 'Impossible de créer le dossier' }
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

    // Remove the wish (it's now a dossier)
    await writeClient
      .from('traveler_wishlists')
      .delete()
      .eq('id', wishId)

    revalidatePath('/client')
    return { dossierId: dossier.id, error: null }
  } catch (err) {
    console.error('[convertWishToInquiry] Unexpected error:', err)
    return { dossierId: null, error: 'Erreur inattendue' }
  }
}

// ─── Add a past trip declaration ─────────────────────────────────────────────

export async function addPastTrip(
  participantId: string,
  countryCode: string,
  isNomadays: boolean = false,
  note?: string,
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'Non authentifié' }
    }

    // Use RPC functions to bypass PostgREST schema cache issue
    const writeClient = createWriteClient()
    const { data, error } = await writeClient.rpc('insert_past_trip', {
      p_participant_id: participantId,
      p_country_code: countryCode.toUpperCase(),
      p_is_nomadays: isNomadays,
      p_note: note || null,
    })

    if (error) {
      console.error('[addPastTrip] Error:', error)
      if (error.code === '23505' || error.message?.includes('unique')) {
        return { data: null, error: 'Vous avez déjà déclaré un voyage dans ce pays' }
      }
      return { data: null, error: error.message }
    }

    revalidatePath('/client')
    return { data, error: null }
  } catch (err) {
    console.error('[addPastTrip] Unexpected error:', err)
    return { data: null, error: 'Erreur inattendue' }
  }
}
