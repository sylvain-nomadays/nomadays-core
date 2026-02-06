'use server'

import { createServerClient } from '@supabase/ssr'
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

// ============================================================
// PARTICIPANTS
// ============================================================

export interface CreateParticipantInput {
  dossierId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  birthDate?: string
  nationality?: string
  isLead?: boolean
  isTraveling?: boolean
  ageCategory?: 'adult' | 'teen' | 'child' | 'infant'
  roomPreference?: string
}

export async function createParticipant(input: CreateParticipantInput) {
  const supabase = await createClient()

  // Get tenant from dossier
  const { data: dossier } = await supabase
    .from('dossiers')
    .select('tenant_id')
    .eq('id', input.dossierId)
    .single()

  if (!dossier) {
    throw new Error('Dossier not found')
  }

  // Create participant
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .insert({
      tenant_id: dossier.tenant_id,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email || null,
      phone: input.phone || null,
      birth_date: input.birthDate || null,
      nationality: input.nationality || null,
      customer_status: 'new_customer' as CustomerStatus,
    })
    .select()
    .single()

  if (participantError) {
    console.error('Error creating participant:', participantError)
    throw new Error('Failed to create participant')
  }

  // Link participant to dossier
  const { error: linkError } = await supabase
    .from('dossier_participants')
    .insert({
      dossier_id: input.dossierId,
      participant_id: participant.id,
      is_lead: input.isLead || false,
      is_traveling: input.isTraveling !== false,
      age_category: input.ageCategory || 'adult',
      room_preference: input.roomPreference || null,
    })

  if (linkError) {
    console.error('Error linking participant:', linkError)
    throw new Error('Failed to link participant to dossier')
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
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    birthDate?: string
    nationality?: string
  }
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (updates.firstName) updateData.first_name = updates.firstName
  if (updates.lastName) updateData.last_name = updates.lastName
  if (updates.email !== undefined) updateData.email = updates.email || null
  if (updates.phone !== undefined) updateData.phone = updates.phone || null
  if (updates.birthDate !== undefined) updateData.birth_date = updates.birthDate || null
  if (updates.nationality !== undefined) updateData.nationality = updates.nationality || null

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
  }
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (updates.isLead !== undefined) updateData.is_lead = updates.isLead
  if (updates.isTraveling !== undefined) updateData.is_traveling = updates.isTraveling
  if (updates.ageCategory) updateData.age_category = updates.ageCategory
  if (updates.roomPreference !== undefined) updateData.room_preference = updates.roomPreference || null

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
