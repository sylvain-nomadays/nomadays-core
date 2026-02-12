'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { CustomerStatus } from '@/lib/supabase/database.types'

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

// Write client (service role, bypasses RLS)
function createWriteClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    return createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — cannot create write client')
}

// ============================================================
// PARTICIPANTS
// ============================================================

export type Civility = 'mr' | 'mrs' | 'mx' | 'dr' | 'other'

export interface CreateParticipantInput {
  dossierId: string
  // Identity
  civility?: Civility
  firstName: string
  lastName: string
  birthDate?: string
  nationality?: string
  // Contact
  email?: string
  phone?: string
  whatsapp?: string
  // Address
  address?: string
  city?: string
  postalCode?: string
  country?: string
  // Travel documents
  passportNumber?: string
  passportExpiry?: string
  // Dietary / Medical
  dietaryRequirements?: string
  medicalNotes?: string
  // Free notes
  notes?: string
  // Dossier-specific
  isLead?: boolean
  isTraveling?: boolean
  ageCategory?: 'adult' | 'teen' | 'child' | 'infant'
  roomPreference?: string
  roomShareWith?: string
}

export async function createParticipant(input: CreateParticipantInput) {
  const supabase = await createWriteClient()

  const participantEmail = input.email || `${input.firstName.toLowerCase()}.${input.lastName.toLowerCase()}@noemail.local`
  console.log('[createParticipant] Creating participant:', { ...input, email: participantEmail })
  console.log('[createParticipant] Service key available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Build participant record — only include fields that have values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participantRecord: Record<string, any> = {
    first_name: input.firstName,
    last_name: input.lastName,
    email: participantEmail,
  }
  // Optional fields — only include if provided
  if (input.civility) participantRecord.civility = input.civility
  if (input.phone) participantRecord.phone = input.phone
  if (input.whatsapp) participantRecord.whatsapp = input.whatsapp
  if (input.birthDate) participantRecord.birth_date = input.birthDate
  if (input.nationality) participantRecord.nationality = input.nationality
  if (input.address) participantRecord.address = input.address
  if (input.city) participantRecord.city = input.city
  if (input.postalCode) participantRecord.postal_code = input.postalCode
  if (input.country) participantRecord.country = input.country
  if (input.passportNumber) participantRecord.passport_number = input.passportNumber
  if (input.passportExpiry) participantRecord.passport_expiry = input.passportExpiry
  if (input.dietaryRequirements) participantRecord.dietary_requirements = input.dietaryRequirements
  if (input.medicalNotes) participantRecord.medical_notes = input.medicalNotes
  if (input.notes) participantRecord.notes = input.notes

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: participant, error: participantError } = await (supabase.from('participants') as any)
    .insert(participantRecord)
    .select()
    .single()

  console.log('[createParticipant] Insert result:', { participant: participant?.id, error: participantError ? JSON.stringify(participantError) : null })

  if (participantError) {
    console.error('[createParticipant] Error creating participant:', JSON.stringify(participantError, null, 2))
    throw new Error(`Failed to create participant: ${participantError.message}`)
  }

  // Link participant to dossier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: linkError } = await (supabase.from('dossier_participants') as any)
    .insert({
      dossier_id: input.dossierId,
      participant_id: participant.id,
      is_lead: input.isLead || false,
      is_traveling: input.isTraveling !== false,
      age_category: input.ageCategory || 'adult',
      room_preference: input.roomPreference || null,
      room_share_with: input.roomShareWith || null,
    })

  if (linkError) {
    console.error('Error linking participant:', linkError)
    throw new Error('Failed to link participant to dossier')
  }

  // Bidirectional room sharing: update partner to point back to new participant
  if (input.roomShareWith) {
    await supabase
      .from('dossier_participants')
      .update({ room_share_with: participant.id })
      .eq('dossier_id', input.dossierId)
      .eq('participant_id', input.roomShareWith)
  }

  // Update dossier last_activity_at
  await supabase
    .from('dossiers')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', input.dossierId)

  // Log event
  await supabase.from('events').insert({
    dossier_id: input.dossierId,
    event_type: 'participant_added',
    payload: { participant_id: participant.id, name: `${input.firstName} ${input.lastName}` }
  })

  revalidatePath(`/admin/dossiers/${input.dossierId}`)
  return participant
}

export async function updateParticipant(
  participantId: string,
  dossierId: string,
  updates: {
    civility?: string | null
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    whatsapp?: string
    birthDate?: string
    nationality?: string
    address?: string
    city?: string
    postalCode?: string
    country?: string
    passportNumber?: string
    passportExpiry?: string
    dietaryRequirements?: string
    medicalNotes?: string
    notes?: string
  }
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (updates.firstName) updateData.first_name = updates.firstName
  if (updates.lastName) updateData.last_name = updates.lastName
  if (updates.email !== undefined) updateData.email = updates.email || null
  if (updates.phone !== undefined) updateData.phone = updates.phone || null
  if (updates.whatsapp !== undefined) updateData.whatsapp = updates.whatsapp || null
  if (updates.birthDate !== undefined) updateData.birth_date = updates.birthDate || null
  if (updates.nationality !== undefined) updateData.nationality = updates.nationality || null
  if (updates.civility !== undefined) updateData.civility = updates.civility || null
  if (updates.address !== undefined) updateData.address = updates.address || null
  if (updates.city !== undefined) updateData.city = updates.city || null
  if (updates.postalCode !== undefined) updateData.postal_code = updates.postalCode || null
  if (updates.country !== undefined) updateData.country = updates.country || null
  if (updates.passportNumber !== undefined) updateData.passport_number = updates.passportNumber || null
  if (updates.passportExpiry !== undefined) updateData.passport_expiry = updates.passportExpiry || null
  if (updates.dietaryRequirements !== undefined) updateData.dietary_requirements = updates.dietaryRequirements || null
  if (updates.medicalNotes !== undefined) updateData.medical_notes = updates.medicalNotes || null
  if (updates.notes !== undefined) updateData.notes = updates.notes || null

  const { data, error } = await supabase
    .from('participants')
    .update(updateData)
    .eq('id', participantId)
    .select()
    .single()

  if (error) {
    console.error('Error updating participant:', error)
    throw new Error('Failed to update participant')
  }

  revalidatePath(`/admin/dossiers/${dossierId}`)
  return data
}

export async function updateDossierParticipant(
  dossierId: string,
  participantId: string,
  updates: {
    isLead?: boolean
    isTraveling?: boolean
    ageCategory?: 'adult' | 'teen' | 'child' | 'infant'
    roomPreference?: string
    roomShareWith?: string | null
  }
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (updates.isLead !== undefined) updateData.is_lead = updates.isLead
  if (updates.isTraveling !== undefined) updateData.is_traveling = updates.isTraveling
  if (updates.ageCategory) updateData.age_category = updates.ageCategory
  if (updates.roomPreference !== undefined) updateData.room_preference = updates.roomPreference || null
  if (updates.roomShareWith !== undefined) updateData.room_share_with = updates.roomShareWith

  // Get the current room_share_with before update (for bidirectional sync)
  let previousRoomShareWith: string | null = null
  if (updates.roomShareWith !== undefined) {
    const { data: current } = await supabase
      .from('dossier_participants')
      .select('room_share_with')
      .eq('dossier_id', dossierId)
      .eq('participant_id', participantId)
      .single()
    previousRoomShareWith = current?.room_share_with || null
  }

  const { data, error } = await supabase
    .from('dossier_participants')
    .update(updateData)
    .eq('dossier_id', dossierId)
    .eq('participant_id', participantId)
    .select()
    .single()

  if (error) {
    console.error('Error updating dossier participant:', error)
    throw new Error('Failed to update participant preferences')
  }

  // Bidirectional room sharing: keep partner in sync
  if (updates.roomShareWith !== undefined) {
    const newPartner = updates.roomShareWith || null

    // If there was a previous partner and it's changed, clear the old partner's room_share_with
    if (previousRoomShareWith && previousRoomShareWith !== newPartner) {
      await supabase
        .from('dossier_participants')
        .update({ room_share_with: null })
        .eq('dossier_id', dossierId)
        .eq('participant_id', previousRoomShareWith)
        .eq('room_share_with', participantId) // Only clear if they still point to us
    }

    // If a new partner is set, update the partner to point back to this participant
    if (newPartner) {
      await supabase
        .from('dossier_participants')
        .update({ room_share_with: participantId })
        .eq('dossier_id', dossierId)
        .eq('participant_id', newPartner)
    }
  }

  revalidatePath(`/admin/dossiers/${dossierId}`)
  return data
}

export async function removeParticipantFromDossier(dossierId: string, participantId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('dossier_participants')
    .delete()
    .eq('dossier_id', dossierId)
    .eq('participant_id', participantId)

  if (error) {
    console.error('Error removing participant:', error)
    throw new Error('Failed to remove participant')
  }

  // Log event
  await supabase.from('events').insert({
    dossier_id: dossierId,
    event_type: 'participant_removed',
    payload: { participant_id: participantId }
  })

  revalidatePath(`/admin/dossiers/${dossierId}`)
}

export async function setLeadParticipant(dossierId: string, participantId: string) {
  const supabase = await createClient()

  // Remove lead from all participants
  await supabase
    .from('dossier_participants')
    .update({ is_lead: false })
    .eq('dossier_id', dossierId)

  // Set new lead
  const { error } = await supabase
    .from('dossier_participants')
    .update({ is_lead: true })
    .eq('dossier_id', dossierId)
    .eq('participant_id', participantId)

  if (error) {
    console.error('Error setting lead participant:', error)
    throw new Error('Failed to set lead participant')
  }

  revalidatePath(`/admin/dossiers/${dossierId}`)
}

export async function sendPortalInvitation(participantId: string, dossierId: string) {
  const supabase = await createClient()

  // Get participant email
  const { data: participant } = await supabase
    .from('participants')
    .select('email, first_name, last_name')
    .eq('id', participantId)
    .single()

  if (!participant?.email) {
    throw new Error('Participant has no email address')
  }

  // TODO: Generate magic link and send email via Resend
  // For now, just mark as having access
  await supabase
    .from('participants')
    .update({ has_portal_access: true })
    .eq('id', participantId)

  // Log event
  await supabase.from('events').insert({
    dossier_id: dossierId,
    event_type: 'email_sent',
    payload: {
      type: 'portal_invitation',
      recipient: participant.email,
      participant_name: `${participant.first_name} ${participant.last_name}`
    }
  })

  revalidatePath(`/admin/dossiers/${dossierId}`)
  return { success: true, email: participant.email }
}
