'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/resend'
import { generateEmailHtml } from '@/lib/email/templates'
import { getAgeCategoryFromBirthDate } from '@/lib/constants/participant-options'

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
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
}

// ─── Access verification ─────────────────────────────────────────────────────

async function verifyParticipantAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dossierId: string,
  participantId: string,
  requireLead = false
) {
  const { data: dp } = await supabase
    .from('dossier_participants')
    .select('id, is_lead')
    .eq('dossier_id', dossierId)
    .eq('participant_id', participantId)
    .single()

  if (!dp) {
    throw new Error('Access denied: participant not linked to dossier')
  }
  if (requireLead && !dp.is_lead) {
    throw new Error('Access denied: only the lead contact can perform this action')
  }
  return dp
}

// ─── Notification helper ─────────────────────────────────────────────────────

async function notifyAdvisorOfChange(input: {
  dossierId: string
  participantName: string
  notificationType: string
  notificationTitle: string
  message: string
  eventType: string
  eventPayload: Record<string, unknown>
}) {
  const supabase = await createClient()

  // Fetch dossier info
  const { data: dossier } = await (supabase.from('dossiers') as any)
    .select('advisor_id, assigned_to_id, title, reference')
    .eq('id', input.dossierId)
    .single() as { data: any | null }

  if (!dossier) return

  const advisorId = dossier.advisor_id || dossier.assigned_to_id
  const dossierRef = dossier.reference || dossier.title || input.dossierId

  // 1. Create system message in dossier_messages
  const threadId = crypto.randomUUID()
  await supabase.from('dossier_messages').insert({
    dossier_id: input.dossierId,
    thread_id: threadId,
    direction: 'inbound',
    sender_type: 'system',
    sender_name: 'Nomadays',
    sender_email: 'system@nomadays.com',
    recipient_email: '',
    body_text: input.message,
    body_html: null,
    attachments: [],
    status: 'sent',
  })

  // 2. Create notification for advisor
  if (advisorId) {
    await supabase.from('notifications').insert({
      user_id: advisorId,
      type: input.notificationType,
      title: input.notificationTitle,
      message: `${input.message} — Dossier ${dossierRef}`,
      link: `/admin/dossiers/${input.dossierId}`,
      metadata: {
        dossier_id: input.dossierId,
        modified_by: input.participantName,
      },
    })

    // 3. Send email to advisor
    // Fetch advisor email
    const { data: advisor } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', advisorId)
      .single()

    if (advisor?.email) {
      const emailHtml = generateEmailHtml(
        `📋 Modification sur le dossier ${dossierRef}\n\n${input.message}\n\n→ Voir le dossier : ${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/dossiers/${input.dossierId}`,
        input.participantName
      )
      await sendEmail({
        to: advisor.email,
        toName: `${advisor.first_name || ''} ${advisor.last_name || ''}`.trim(),
        subject: `[Nomadays] Modification dossier ${dossierRef}`,
        html: emailHtml,
        text: input.message,
      })
    }
  }

  // 4. Log event
  await supabase.from('events').insert({
    dossier_id: input.dossierId,
    event_type: input.eventType,
    payload: input.eventPayload,
  })

  // 5. Update last_activity_at
  await supabase
    .from('dossiers')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', input.dossierId)
}

// ─── Format helpers ──────────────────────────────────────────────────────────

function formatDateFr(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatPaxLabel(adults: number, teens: number, children: number, infants: number): string {
  const parts: string[] = []
  if (adults > 0) parts.push(`${adults} adulte${adults > 1 ? 's' : ''}`)
  if (teens > 0) parts.push(`${teens} ado${teens > 1 ? 's' : ''}`)
  if (children > 0) parts.push(`${children} enfant${children > 1 ? 's' : ''}`)
  if (infants > 0) parts.push(`${infants} bébé${infants > 1 ? 's' : ''}`)
  return parts.join(', ') || '0 voyageur'
}

// ============================================================
// PUBLIC SERVER ACTIONS
// ============================================================

/**
 * Update travel dates on a dossier (lead-only)
 */
export async function updateDossierDates(input: {
  dossierId: string
  participantId: string
  participantName: string
  departureDateFrom: string | null
  departureDateTo: string | null
  durationDays: number | null
}) {
  const supabase = await createClient()
  await verifyParticipantAccess(supabase, input.dossierId, input.participantId, true)

  // Fetch old dates for diff
  const { data: oldDossier } = await (supabase.from('dossiers') as any)
    .select('departure_date_from, departure_date_to, duration_days')
    .eq('id', input.dossierId)
    .single() as { data: any | null }

  // Update
  const updateData: Record<string, unknown> = {}
  if (input.departureDateFrom !== undefined) updateData.departure_date_from = input.departureDateFrom
  if (input.departureDateTo !== undefined) updateData.departure_date_to = input.departureDateTo
  if (input.durationDays !== undefined) updateData.duration_days = input.durationDays

  const { error } = await (supabase.from('dossiers') as any)
    .update(updateData)
    .eq('id', input.dossierId)

  if (error) {
    console.error('[updateDossierDates] Error:', error)
    throw new Error('Failed to update dates')
  }

  // Build message
  const oldDates = `${formatDateFr(oldDossier?.departure_date_from)} → ${formatDateFr(oldDossier?.departure_date_to)}`
  const newDates = `${formatDateFr(input.departureDateFrom)} → ${formatDateFr(input.departureDateTo)}`
  const durationLabel = input.durationDays ? ` (${input.durationDays} jours)` : ''

  await notifyAdvisorOfChange({
    dossierId: input.dossierId,
    participantName: input.participantName,
    notificationType: 'dates_modified',
    notificationTitle: 'Dates de voyage modifiées',
    message: `${input.participantName} a modifié les dates de voyage : ${newDates}${durationLabel} (était : ${oldDates})`,
    eventType: 'dossier_dates_modified_by_client',
    eventPayload: {
      modified_by: input.participantName,
      old_dates: {
        from: oldDossier?.departure_date_from,
        to: oldDossier?.departure_date_to,
        duration: oldDossier?.duration_days,
      },
      new_dates: {
        from: input.departureDateFrom,
        to: input.departureDateTo,
        duration: input.durationDays,
      },
    },
  })

  revalidatePath(`/client/voyages/${input.dossierId}`)
  return { success: true }
}

/**
 * Update pax counts on a dossier (lead-only)
 */
export async function updateDossierPaxCount(input: {
  dossierId: string
  participantId: string
  participantName: string
  paxAdults: number
  paxTeens: number
  paxChildren: number
  paxInfants: number
}) {
  const supabase = await createClient()
  await verifyParticipantAccess(supabase, input.dossierId, input.participantId, true)

  // Fetch old counts for diff
  const { data: oldDossier } = await (supabase.from('dossiers') as any)
    .select('pax_adults, pax_teens, pax_children, pax_infants')
    .eq('id', input.dossierId)
    .single() as { data: any | null }

  // Update
  const { error } = await (supabase.from('dossiers') as any)
    .update({
      pax_adults: input.paxAdults,
      pax_teens: input.paxTeens,
      pax_children: input.paxChildren,
      pax_infants: input.paxInfants,
    })
    .eq('id', input.dossierId)

  if (error) {
    console.error('[updateDossierPaxCount] Error:', error)
    throw new Error('Failed to update pax count')
  }

  const oldLabel = formatPaxLabel(
    oldDossier?.pax_adults || 0,
    oldDossier?.pax_teens || 0,
    oldDossier?.pax_children || 0,
    oldDossier?.pax_infants || 0
  )
  const newLabel = formatPaxLabel(input.paxAdults, input.paxTeens, input.paxChildren, input.paxInfants)

  await notifyAdvisorOfChange({
    dossierId: input.dossierId,
    participantName: input.participantName,
    notificationType: 'pax_modified',
    notificationTitle: 'Composition du groupe modifiée',
    message: `${input.participantName} a modifié la composition du groupe : ${newLabel} (était : ${oldLabel})`,
    eventType: 'dossier_pax_modified_by_client',
    eventPayload: {
      modified_by: input.participantName,
      old_pax: {
        adults: oldDossier?.pax_adults || 0,
        teens: oldDossier?.pax_teens || 0,
        children: oldDossier?.pax_children || 0,
        infants: oldDossier?.pax_infants || 0,
      },
      new_pax: {
        adults: input.paxAdults,
        teens: input.paxTeens,
        children: input.paxChildren,
        infants: input.paxInfants,
      },
    },
  })

  revalidatePath(`/client/voyages/${input.dossierId}`)
  return { success: true }
}

/**
 * Add a participant from the client side (lead-only)
 */
export async function clientAddParticipant(input: {
  dossierId: string
  requestingParticipantId: string
  requestingParticipantName: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  ageCategory: 'adult' | 'teen' | 'child' | 'infant'
  sendInvitation?: boolean
  // Extended profile fields
  civility?: string
  birthDate?: string
  nationality?: string
  whatsapp?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  passportNumber?: string
  passportExpiry?: string
  dietaryRequirements?: string
  medicalNotes?: string
}) {
  const supabase = await createClient()
  await verifyParticipantAccess(supabase, input.dossierId, input.requestingParticipantId, true)

  const writeClient = createWriteClient()

  // Create participant
  const participantEmail = input.email || `${input.firstName.toLowerCase()}.${input.lastName.toLowerCase()}@noemail.local`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participantRecord: Record<string, any> = {
    first_name: input.firstName,
    last_name: input.lastName,
    email: participantEmail,
  }
  if (input.phone) participantRecord.phone = input.phone
  if (input.civility) participantRecord.civility = input.civility
  if (input.birthDate) participantRecord.birth_date = input.birthDate
  if (input.nationality) participantRecord.nationality = input.nationality
  if (input.whatsapp) participantRecord.whatsapp = input.whatsapp
  if (input.address) participantRecord.address = input.address
  if (input.city) participantRecord.city = input.city
  if (input.postalCode) participantRecord.postal_code = input.postalCode
  if (input.country) participantRecord.country = input.country
  if (input.passportNumber) participantRecord.passport_number = input.passportNumber
  if (input.passportExpiry) participantRecord.passport_expiry = input.passportExpiry
  if (input.dietaryRequirements) participantRecord.dietary_requirements = input.dietaryRequirements
  if (input.medicalNotes) participantRecord.medical_notes = input.medicalNotes

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: participant, error: participantError } = await (writeClient.from('participants') as any)
    .insert(participantRecord)
    .select()
    .single()

  if (participantError) {
    console.error('[clientAddParticipant] Error creating participant:', participantError)
    throw new Error('Failed to create participant')
  }

  // Generate invitation token
  const invitationToken = input.sendInvitation || input.email ? crypto.randomUUID() : null

  // Auto-calculate age category from birth date if provided
  const ageCategory = input.birthDate
    ? getAgeCategoryFromBirthDate(input.birthDate)
    : input.ageCategory

  // Link participant to dossier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: linkError } = await (writeClient.from('dossier_participants') as any)
    .insert({
      dossier_id: input.dossierId,
      participant_id: participant.id,
      is_lead: false,
      is_traveling: true,
      age_category: ageCategory,
      invitation_token: invitationToken,
      invited_at: invitationToken ? new Date().toISOString() : null,
      invited_by: input.requestingParticipantId,
    })

  if (linkError) {
    console.error('[clientAddParticipant] Error linking participant:', linkError)
    throw new Error('Failed to link participant to dossier')
  }

  // Increment pax count
  const paxField = {
    adult: 'pax_adults',
    teen: 'pax_teens',
    child: 'pax_children',
    infant: 'pax_infants',
  }[ageCategory]

  const { data: currentDossier } = await (supabase.from('dossiers') as any)
    .select(paxField)
    .eq('id', input.dossierId)
    .single() as { data: any | null }

  if (currentDossier) {
    await (supabase.from('dossiers') as any)
      .update({ [paxField]: (currentDossier[paxField] || 0) + 1 })
      .eq('id', input.dossierId)
  }

  // Send invitation email if requested
  if (input.sendInvitation && input.email && invitationToken) {
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/invitation/${invitationToken}`
    const emailHtml = generateEmailHtml(
      `Bonjour ${input.firstName},\n\n${input.requestingParticipantName} vous invite à accéder à l'espace voyage de votre prochain séjour.\n\nCliquez sur le lien ci-dessous pour créer votre compte et accéder à toutes les informations de votre voyage :\n\n${invitationUrl}\n\nÀ bientôt !`,
      input.requestingParticipantName
    )
    await sendEmail({
      to: input.email,
      toName: `${input.firstName} ${input.lastName}`,
      subject: `${input.requestingParticipantName} vous invite à rejoindre votre espace voyage`,
      html: emailHtml,
      text: `${input.requestingParticipantName} vous invite à accéder à l'espace voyage. Créez votre compte ici : ${invitationUrl}`,
    })

    // Mark participant as having portal access pending
    await (writeClient.from('participants') as any)
      .update({ has_portal_access: true })
      .eq('id', participant.id)
  }

  // Notify advisor
  const ageCategoryLabel = {
    adult: 'adulte',
    teen: 'adolescent',
    child: 'enfant',
    infant: 'bébé',
  }[ageCategory]

  await notifyAdvisorOfChange({
    dossierId: input.dossierId,
    participantName: input.requestingParticipantName,
    notificationType: 'participant_added_by_client',
    notificationTitle: 'Nouveau voyageur ajouté',
    message: `${input.requestingParticipantName} a ajouté un voyageur : ${input.firstName} ${input.lastName} (${ageCategoryLabel})`,
    eventType: 'participant_added_by_client',
    eventPayload: {
      participant_id: participant.id,
      name: `${input.firstName} ${input.lastName}`,
      age_category: input.ageCategory,
      added_by: input.requestingParticipantName,
      invitation_sent: !!input.sendInvitation,
    },
  })

  revalidatePath(`/client/voyages/${input.dossierId}`)
  return { success: true, participantId: participant.id, invitationToken }
}

/**
 * Generate an invitation link for a participant (lead-only)
 */
export async function generateInvitationLink(input: {
  dossierId: string
  participantId: string
  firstName: string
  lastName: string
  email?: string
  ageCategory: 'adult' | 'teen' | 'child' | 'infant'
  requestingParticipantId: string
}) {
  const supabase = await createClient()
  await verifyParticipantAccess(supabase, input.dossierId, input.requestingParticipantId, true)

  const writeClient = createWriteClient()

  // Create participant with minimal info
  const participantEmail = input.email || `${input.firstName.toLowerCase()}.${input.lastName.toLowerCase()}@noemail.local`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: participant, error: participantError } = await (writeClient.from('participants') as any)
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      email: participantEmail,
    })
    .select()
    .single()

  if (participantError) {
    console.error('[generateInvitationLink] Error:', participantError)
    throw new Error('Failed to create participant')
  }

  const invitationToken = crypto.randomUUID()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (writeClient.from('dossier_participants') as any)
    .insert({
      dossier_id: input.dossierId,
      participant_id: participant.id,
      is_lead: false,
      is_traveling: true,
      age_category: input.ageCategory,
      invitation_token: invitationToken,
      invited_at: new Date().toISOString(),
      invited_by: input.requestingParticipantId,
    })

  // Increment pax count
  const paxField = {
    adult: 'pax_adults',
    teen: 'pax_teens',
    child: 'pax_children',
    infant: 'pax_infants',
  }[input.ageCategory]

  const { data: currentDossier } = await (supabase.from('dossiers') as any)
    .select(paxField)
    .eq('id', input.dossierId)
    .single() as { data: any | null }

  if (currentDossier) {
    await (supabase.from('dossiers') as any)
      .update({ [paxField]: (currentDossier[paxField] || 0) + 1 })
      .eq('id', input.dossierId)
  }

  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/invitation/${invitationToken}`

  revalidatePath(`/client/voyages/${input.dossierId}`)
  return { success: true, invitationUrl, invitationToken }
}

/**
 * Transfer lead status to another participant (lead-only)
 */
export async function transferLead(input: {
  dossierId: string
  currentLeadId: string
  currentLeadName: string
  newLeadId: string
  newLeadName: string
}) {
  const supabase = await createClient()
  await verifyParticipantAccess(supabase, input.dossierId, input.currentLeadId, true)

  // Remove lead from current
  await supabase
    .from('dossier_participants')
    .update({ is_lead: false })
    .eq('dossier_id', input.dossierId)
    .eq('participant_id', input.currentLeadId)

  // Set lead on new
  const { error } = await supabase
    .from('dossier_participants')
    .update({ is_lead: true })
    .eq('dossier_id', input.dossierId)
    .eq('participant_id', input.newLeadId)

  if (error) {
    console.error('[transferLead] Error:', error)
    throw new Error('Failed to transfer lead')
  }

  await notifyAdvisorOfChange({
    dossierId: input.dossierId,
    participantName: input.currentLeadName,
    notificationType: 'lead_transferred',
    notificationTitle: 'Contact principal transféré',
    message: `${input.currentLeadName} a transféré le rôle de contact principal à ${input.newLeadName}`,
    eventType: 'lead_transferred_by_client',
    eventPayload: {
      old_lead: input.currentLeadName,
      new_lead: input.newLeadName,
      old_lead_id: input.currentLeadId,
      new_lead_id: input.newLeadId,
    },
  })

  revalidatePath(`/client/voyages/${input.dossierId}`)
  return { success: true }
}

// ─── Client selects a proposal ──────────────────────────────────────────────

export async function clientChooseProposal(input: {
  dossierId: string
  participantId: string
  participantName: string
  tripId: number
  cotationId?: number
}) {
  const supabase = await createClient()
  const writeClient = createWriteClient()

  await verifyParticipantAccess(supabase, input.dossierId, input.participantId, true)

  // Fetch the trip and verify it belongs to this dossier (trips have dossier_id directly)
  const { data: trip } = await supabase
    .from('trips' as any)
    .select('id, name, status, dossier_id')
    .eq('id', input.tripId)
    .single() as { data: { id: number; name: string; status: string; dossier_id: string } | null }

  if (!trip) {
    throw new Error('Trip not found')
  }

  if (trip.dossier_id !== input.dossierId) {
    throw new Error('This trip is not linked to the dossier')
  }

  // If a cotation is specified, fetch its display name
  let cotationName: string | null = null
  if (input.cotationId) {
    const { data: cotation } = await supabase
      .from('trip_cotations' as any)
      .select('id, name, client_label')
      .eq('id', input.cotationId)
      .single() as { data: { id: number; name: string; client_label: string | null } | null }

    if (cotation) {
      cotationName = cotation.client_label || cotation.name
    }
  }

  // Update the trip status to 'option' (not confirmed — confirmed happens after deposit)
  await writeClient
    .from('trips' as any)
    .update({ status: 'option' })
    .eq('id', input.tripId)

  // Set other trips for this dossier to 'cancelled'
  const { data: otherTrips } = await writeClient
    .from('trips' as any)
    .select('id')
    .eq('dossier_id', input.dossierId)
    .neq('id', input.tripId)
    .neq('status', 'cancelled') as { data: { id: number }[] | null }

  if (otherTrips && otherTrips.length > 0) {
    const otherTripIds = otherTrips.map((t) => t.id)
    await writeClient
      .from('trips' as any)
      .update({ status: 'cancelled' })
      .in('id', otherTripIds)
  }

  // Fetch current dossier status before changing it (for rollback on deselection)
  const { data: dossierBeforeUpdate } = await supabase
    .from('dossiers')
    .select('status')
    .eq('id', input.dossierId)
    .single()

  const statusBeforeSelection = dossierBeforeUpdate?.status || 'quote_sent'

  // Update dossier: select this trip + cotation + transition to 'option' status
  const dossierUpdate: Record<string, unknown> = {
    selected_trip_id: input.tripId,
    selected_at: new Date().toISOString(),
    status: 'option',
    status_before_selection: statusBeforeSelection,
  }
  if (input.cotationId) {
    dossierUpdate.selected_cotation_id = input.cotationId
    dossierUpdate.selected_cotation_name = cotationName
  }

  await writeClient
    .from('dossiers')
    .update(dossierUpdate as any)
    .eq('id', input.dossierId)

  // Notify the advisor
  const optionSuffix = cotationName ? ` — option ${cotationName}` : ''
  await notifyAdvisorOfChange({
    dossierId: input.dossierId,
    participantName: input.participantName,
    notificationType: 'proposal_accepted',
    notificationTitle: `${input.participantName} a choisi une proposition`,
    message: `${input.participantName} a sélectionné la proposition « ${trip.name} »${optionSuffix}`,
    eventType: 'proposal_selected_by_client',
    eventPayload: {
      trip_id: input.tripId,
      trip_name: trip.name,
      selected_by: input.participantName,
      ...(input.cotationId ? { cotation_id: input.cotationId, cotation_name: cotationName } : {}),
    },
  })

  revalidatePath(`/client/voyages/${input.dossierId}`)
  return { success: true, tripName: trip.name, cotationName }
}

// ─── Client deselects a proposal (undo selection) ───────────────────────────

export async function clientUnchooseProposal(input: {
  dossierId: string
  participantId: string
  participantName: string
}) {
  const supabase = await createClient()
  const writeClient = createWriteClient()

  await verifyParticipantAccess(supabase, input.dossierId, input.participantId, true)

  // Fetch the dossier to get selected_trip_id and status_before_selection
  const { data: dossier } = await supabase
    .from('dossiers')
    .select('id, status, selected_trip_id, status_before_selection')
    .eq('id', input.dossierId)
    .single() as { data: { id: string; status: string; selected_trip_id: number | null; status_before_selection: string | null } | null }

  if (!dossier) {
    throw new Error('Dossier not found')
  }

  // Allow deselection unless dossier is in an irrevocable state
  const irrevocableStatuses = ['confirmed', 'operating', 'completed']
  if (irrevocableStatuses.includes(dossier.status)) {
    throw new Error('Le dossier ne peut plus être modifié dans son statut actuel')
  }

  if (!dossier.selected_trip_id) {
    throw new Error('Aucune proposition sélectionnée')
  }

  // Fetch the currently selected trip name for notification
  const { data: selectedTrip } = await supabase
    .from('trips' as any)
    .select('id, name')
    .eq('id', dossier.selected_trip_id)
    .single() as { data: { id: number; name: string } | null }

  const tripName = selectedTrip?.name || 'Proposition inconnue'

  // Revert the selected trip from 'option' back to 'sent'
  await writeClient
    .from('trips' as any)
    .update({ status: 'sent' })
    .eq('id', dossier.selected_trip_id)

  // Restore all cancelled trips for this dossier back to 'sent'
  const { data: cancelledTrips } = await writeClient
    .from('trips' as any)
    .select('id')
    .eq('dossier_id', input.dossierId)
    .eq('status', 'cancelled') as { data: { id: number }[] | null }

  if (cancelledTrips && cancelledTrips.length > 0) {
    await writeClient
      .from('trips' as any)
      .update({ status: 'sent' })
      .in('id', cancelledTrips.map((t) => t.id))
  }

  // Clear dossier selection and revert status
  const revertStatus = dossier.status_before_selection || 'quote_sent'
  await writeClient
    .from('dossiers')
    .update({
      selected_trip_id: null,
      selected_at: null,
      selected_cotation_id: null,
      selected_cotation_name: null,
      status: revertStatus,
      status_before_selection: null,
    } as any)
    .eq('id', input.dossierId)

  // Notify the advisor
  const totalRestored = (cancelledTrips?.length || 0) + 1
  await notifyAdvisorOfChange({
    dossierId: input.dossierId,
    participantName: input.participantName,
    notificationType: 'proposal_accepted',
    notificationTitle: `${input.participantName} a changé d'avis`,
    message: `${input.participantName} a désélectionné la proposition « ${tripName} ». ${totalRestored} proposition${totalRestored > 1 ? 's' : ''} restaurée${totalRestored > 1 ? 's' : ''}.`,
    eventType: 'proposal_deselected_by_client',
    eventPayload: {
      trip_id: dossier.selected_trip_id,
      trip_name: tripName,
      deselected_by: input.participantName,
      trips_restored: totalRestored,
    },
  })

  revalidatePath(`/client/voyages/${input.dossierId}`)
  return { success: true, tripsRestored: totalRestored }
}

// ─── Travel logistics (client can add/edit/delete their own flights) ────────

const TRANSPORT_LABELS: Record<string, string> = {
  flight: 'Vol',
  train: 'Train',
  bus: 'Bus',
  car: 'Voiture',
  boat: 'Bateau',
  other: 'Autre',
}

export async function clientCreateTravelLogistic(input: {
  dossierId: string
  participantId: string
  participantName: string
  type: 'arrival' | 'departure'
  transportType: string
  transportInfo?: string
  scheduledDatetime?: string
  location?: string
  notes?: string
}) {
  const supabase = await createClient()

  await verifyParticipantAccess(supabase, input.dossierId, input.participantId)

  // Convert datetime-local format to ISO for TIMESTAMPTZ
  let scheduledDt: string | null = null
  if (input.scheduledDatetime) {
    try {
      scheduledDt = new Date(input.scheduledDatetime).toISOString()
    } catch {
      scheduledDt = input.scheduledDatetime
    }
  }

  const insertPayload = {
    dossier_id: input.dossierId,
    type: input.type,
    transport_type: input.transportType,
    transport_info: input.transportInfo || null,
    scheduled_datetime: scheduledDt,
    location: input.location || null,
    all_participants: true,
    notes: input.notes || null,
  }

  const { data, error } = await supabase
    .from('travel_logistics')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    console.error('Error creating travel logistic:', error.message, error.details, error.hint, 'payload:', insertPayload)
    throw new Error(`Erreur lors de l'enregistrement: ${error.message}`)
  }

  // Build notification message
  const typeLabel = input.type === 'arrival' ? 'arrivée' : 'départ'
  const transportLabel = TRANSPORT_LABELS[input.transportType] || input.transportType
  let detail = transportLabel
  if (input.transportInfo) detail += ` ${input.transportInfo}`
  if (input.location) detail += ` — ${input.location}`
  if (input.scheduledDatetime) {
    const dt = new Date(input.scheduledDatetime)
    detail += ` le ${dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  }

  await notifyAdvisorOfChange({
    dossierId: input.dossierId,
    participantName: input.participantName,
    notificationType: 'dates_modified',
    notificationTitle: `${input.participantName} a ajouté un vol`,
    message: `${input.participantName} a renseigné son ${typeLabel} : ${detail}`,
    eventType: 'travel_logistic_added_by_client',
    eventPayload: {
      logistic_id: data.id,
      type: input.type,
      transport_type: input.transportType,
      added_by: input.participantName,
    },
  })

  revalidatePath(`/client/voyages/${input.dossierId}`)
  revalidatePath(`/admin/dossiers/${input.dossierId}`)
  revalidatePath('/admin/calendar')
  return data
}

export async function clientUpdateTravelLogistic(input: {
  dossierId: string
  participantId: string
  participantName: string
  logisticId: string
  transportType?: string
  transportInfo?: string
  scheduledDatetime?: string
  location?: string
  notes?: string
}) {
  const supabase = await createClient()

  await verifyParticipantAccess(supabase, input.dossierId, input.participantId)

  const updateData: Record<string, unknown> = {}
  if (input.transportType !== undefined) updateData.transport_type = input.transportType
  if (input.transportInfo !== undefined) updateData.transport_info = input.transportInfo || null
  if (input.scheduledDatetime !== undefined) {
    try {
      updateData.scheduled_datetime = input.scheduledDatetime ? new Date(input.scheduledDatetime).toISOString() : null
    } catch {
      updateData.scheduled_datetime = input.scheduledDatetime || null
    }
  }
  if (input.location !== undefined) updateData.location = input.location || null
  if (input.notes !== undefined) updateData.notes = input.notes || null

  const { data, error } = await supabase
    .from('travel_logistics')
    .update(updateData)
    .eq('id', input.logisticId)
    .eq('dossier_id', input.dossierId)
    .select()
    .single()

  if (error) {
    console.error('Error updating travel logistic:', error.message, error.details, error.hint)
    throw new Error(`Erreur lors de la modification: ${error.message}`)
  }

  await notifyAdvisorOfChange({
    dossierId: input.dossierId,
    participantName: input.participantName,
    notificationType: 'dates_modified',
    notificationTitle: `${input.participantName} a modifié un vol`,
    message: `${input.participantName} a modifié ses informations de vol/transport.`,
    eventType: 'travel_logistic_updated_by_client',
    eventPayload: {
      logistic_id: input.logisticId,
      updated_by: input.participantName,
    },
  })

  revalidatePath(`/client/voyages/${input.dossierId}`)
  revalidatePath(`/admin/dossiers/${input.dossierId}`)
  revalidatePath('/admin/calendar')
  return data
}

export async function clientDeleteTravelLogistic(input: {
  dossierId: string
  participantId: string
  participantName: string
  logisticId: string
}) {
  const supabase = await createClient()

  await verifyParticipantAccess(supabase, input.dossierId, input.participantId)

  // Fetch the item before deletion for notification
  const { data: existing } = await supabase
    .from('travel_logistics')
    .select('type, transport_type, transport_info, location')
    .eq('id', input.logisticId)
    .eq('dossier_id', input.dossierId)
    .single()

  const { error } = await supabase
    .from('travel_logistics')
    .delete()
    .eq('id', input.logisticId)
    .eq('dossier_id', input.dossierId)

  if (error) {
    console.error('Error deleting travel logistic:', error)
    throw new Error('Failed to delete travel logistic')
  }

  if (existing) {
    const typeLabel = existing.type === 'arrival' ? 'arrivée' : 'départ'
    const transportLabel = TRANSPORT_LABELS[existing.transport_type as string] || existing.transport_type
    const detail = existing.transport_info
      ? `${transportLabel} ${existing.transport_info}`
      : transportLabel

    await notifyAdvisorOfChange({
      dossierId: input.dossierId,
      participantName: input.participantName,
      notificationType: 'dates_modified',
      notificationTitle: `${input.participantName} a supprimé un vol`,
      message: `${input.participantName} a supprimé son ${typeLabel} : ${detail}`,
      eventType: 'travel_logistic_deleted_by_client',
      eventPayload: {
        logistic_id: input.logisticId,
        deleted_by: input.participantName,
      },
    })
  }

  revalidatePath(`/client/voyages/${input.dossierId}`)
  revalidatePath(`/admin/dossiers/${input.dossierId}`)
  revalidatePath('/admin/calendar')
}

// ============================================================
// PARTICIPANT PROFILE UPDATE (Client-side)
// ============================================================

export async function clientUpdateParticipant(input: {
  dossierId: string
  requestingParticipantId: string
  requestingParticipantName: string
  targetParticipantId: string
  updates: {
    civility?: string | null
    firstName?: string
    lastName?: string
    birthDate?: string
    nationality?: string
    email?: string
    phone?: string
    whatsapp?: string
    address?: string
    city?: string
    postalCode?: string
    country?: string
    passportNumber?: string
    passportExpiry?: string
    dietaryRequirements?: string
    medicalNotes?: string
  }
}) {
  const supabase = await createClient()

  // 1. Verify requesting participant has access to this dossier
  const requestingDp = await verifyParticipantAccess(supabase, input.dossierId, input.requestingParticipantId)

  // 2. Verify target participant also belongs to this dossier
  const { data: targetDp } = await supabase
    .from('dossier_participants')
    .select('id, participant_id, is_lead')
    .eq('dossier_id', input.dossierId)
    .eq('participant_id', input.targetParticipantId)
    .single()

  if (!targetDp) {
    throw new Error('Le voyageur ciblé n\'appartient pas à ce dossier.')
  }

  // 3. Authorization: requesting must be either the target themselves, or the lead
  const isSelf = input.requestingParticipantId === input.targetParticipantId
  const isLead = requestingDp.is_lead
  if (!isSelf && !isLead) {
    throw new Error('Seul le contact principal peut modifier le profil des autres voyageurs.')
  }

  // 4. Build update payload (participants table)
  const updateData: Record<string, unknown> = {}
  const u = input.updates
  if (u.firstName) updateData.first_name = u.firstName
  if (u.lastName) updateData.last_name = u.lastName
  if (u.email !== undefined) updateData.email = u.email || null
  if (u.phone !== undefined) updateData.phone = u.phone || null
  if (u.whatsapp !== undefined) updateData.whatsapp = u.whatsapp || null
  if (u.birthDate !== undefined) updateData.birth_date = u.birthDate || null
  if (u.nationality !== undefined) updateData.nationality = u.nationality || null
  if (u.civility !== undefined) updateData.civility = u.civility || null
  if (u.address !== undefined) updateData.address = u.address || null
  if (u.city !== undefined) updateData.city = u.city || null
  if (u.postalCode !== undefined) updateData.postal_code = u.postalCode || null
  if (u.country !== undefined) updateData.country = u.country || null
  if (u.passportNumber !== undefined) updateData.passport_number = u.passportNumber || null
  if (u.passportExpiry !== undefined) updateData.passport_expiry = u.passportExpiry || null
  if (u.dietaryRequirements !== undefined) updateData.dietary_requirements = u.dietaryRequirements || null
  if (u.medicalNotes !== undefined) updateData.medical_notes = u.medicalNotes || null

  if (Object.keys(updateData).length === 0) {
    return // Nothing to update
  }

  // 5. Update participants table
  const { data, error } = await supabase
    .from('participants')
    .update(updateData)
    .eq('id', input.targetParticipantId)
    .select()
    .single()

  if (error) {
    console.error('Error updating participant profile:', error)
    throw new Error('Erreur lors de la mise à jour du profil.')
  }

  // 6. If birth_date changed → auto-update age_category in dossier_participants
  if (u.birthDate) {
    const ageCategory = getAgeCategoryFromBirthDate(u.birthDate)
    await supabase
      .from('dossier_participants')
      .update({ age_category: ageCategory })
      .eq('dossier_id', input.dossierId)
      .eq('participant_id', input.targetParticipantId)
  }

  // 7. Build notification message
  const targetName = data
    ? `${data.first_name || ''} ${data.last_name || ''}`.trim()
    : input.targetParticipantId
  const message = isSelf
    ? `${input.requestingParticipantName} a mis à jour son profil voyageur.`
    : `${input.requestingParticipantName} a mis à jour le profil de ${targetName}.`

  await notifyAdvisorOfChange({
    dossierId: input.dossierId,
    participantName: input.requestingParticipantName,
    notificationType: 'participant_updated',
    notificationTitle: `Profil voyageur modifié`,
    message,
    eventType: 'participant_profile_updated_by_client',
    eventPayload: {
      target_participant_id: input.targetParticipantId,
      updated_by: input.requestingParticipantName,
      fields_changed: Object.keys(updateData),
    },
  })

  revalidatePath(`/client/voyages/${input.dossierId}`)
  revalidatePath(`/admin/dossiers/${input.dossierId}`)
  return data
}

// ============================================================
// ROOM SHARING (Client-side)
// ============================================================

export async function clientUpdateRoomShare(input: {
  dossierId: string
  requestingParticipantId: string
  requestingParticipantName: string
  targetParticipantId: string
  roomShareWith: string | null
}) {
  const supabase = await createClient()

  // Verify access
  await verifyParticipantAccess(supabase, input.dossierId, input.requestingParticipantId)

  // Verify target belongs to dossier
  const { data: targetDp } = await supabase
    .from('dossier_participants')
    .select('id, participant_id, room_share_with')
    .eq('dossier_id', input.dossierId)
    .eq('participant_id', input.targetParticipantId)
    .single()

  if (!targetDp) {
    throw new Error('Le voyageur ciblé n\'appartient pas à ce dossier.')
  }

  // Get previous partner for bidirectional sync
  const previousRoomShareWith = targetDp.room_share_with || null

  // Update room_share_with
  const { error } = await supabase
    .from('dossier_participants')
    .update({ room_share_with: input.roomShareWith })
    .eq('dossier_id', input.dossierId)
    .eq('participant_id', input.targetParticipantId)

  if (error) {
    console.error('Error updating room share:', error)
    throw new Error('Erreur lors de la mise à jour du partage de chambre.')
  }

  // Bidirectional sync: clear old partner, set new partner
  if (previousRoomShareWith && previousRoomShareWith !== input.roomShareWith) {
    await supabase
      .from('dossier_participants')
      .update({ room_share_with: null })
      .eq('dossier_id', input.dossierId)
      .eq('participant_id', previousRoomShareWith)
      .eq('room_share_with', input.targetParticipantId)
  }

  if (input.roomShareWith) {
    await supabase
      .from('dossier_participants')
      .update({ room_share_with: input.targetParticipantId })
      .eq('dossier_id', input.dossierId)
      .eq('participant_id', input.roomShareWith)
  }

  // Notify advisor
  await notifyAdvisorOfChange({
    dossierId: input.dossierId,
    participantName: input.requestingParticipantName,
    notificationType: 'participant_updated',
    notificationTitle: 'Partage de chambre modifié',
    message: `${input.requestingParticipantName} a modifié les préférences de partage de chambre.`,
    eventType: 'room_share_updated_by_client',
    eventPayload: {
      target_participant_id: input.targetParticipantId,
      room_share_with: input.roomShareWith,
      updated_by: input.requestingParticipantName,
    },
  })

  revalidatePath(`/client/voyages/${input.dossierId}`)
  revalidatePath(`/admin/dossiers/${input.dossierId}`)
}

// ─── Upload passport copy (client → storage) ─────────────────────────────────

const PASSPORT_MAX_SIZE = 10 * 1024 * 1024 // 10MB
const PASSPORT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PASSPORT_STORAGE_BUCKET = 'documents'

export async function clientUploadPassportCopy(input: {
  dossierId: string
  requestingParticipantId: string
  requestingParticipantName: string
  targetParticipantId: string
  targetParticipantName: string
  formData: FormData
}) {
  const supabase = await createClient()
  const writeClient = createWriteClient()

  // 1. Verify access
  const requestingDp = await verifyParticipantAccess(supabase, input.dossierId, input.requestingParticipantId)

  // 2. Verify target belongs to dossier
  const { data: targetDp } = await supabase
    .from('dossier_participants')
    .select('id, participant_id')
    .eq('dossier_id', input.dossierId)
    .eq('participant_id', input.targetParticipantId)
    .single()

  if (!targetDp) {
    throw new Error('Le voyageur ciblé n\'appartient pas à ce dossier.')
  }

  // 3. Authorization: must be self or lead
  if (input.requestingParticipantId !== input.targetParticipantId && !requestingDp.is_lead) {
    throw new Error('Vous ne pouvez uploader le passeport que pour vous-même.')
  }

  // 4. Validate file
  const file = input.formData.get('file') as File | null
  if (!file) {
    throw new Error('Aucun fichier fourni')
  }
  if (!PASSPORT_ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Seules les images JPEG, PNG et WebP sont acceptées')
  }
  if (file.size > PASSPORT_MAX_SIZE) {
    throw new Error('Le fichier ne doit pas dépasser 10 MB')
  }

  // 5. Generate storage path
  const fileId = crypto.randomUUID()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${input.dossierId}/passports/${input.targetParticipantId}_${fileId}.${ext}`

  // 6. Upload to Supabase Storage
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await writeClient.storage
    .from(PASSPORT_STORAGE_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('Error uploading passport copy:', uploadError)
    throw new Error(`Erreur lors de l'upload: ${uploadError.message}`)
  }

  // 7. Delete any previous passport_copy for this participant in this dossier
  const { data: existingDocs } = await (writeClient.from('documents') as any)
    .select('id, file_url')
    .eq('dossier_id', input.dossierId)
    .eq('participant_id', input.targetParticipantId)
    .eq('type', 'passport_copy')

  if (existingDocs && existingDocs.length > 0) {
    // Remove old files from storage
    const oldPaths = existingDocs
      .map((d: any) => d.file_url)
      .filter(Boolean) as string[]
    if (oldPaths.length > 0) {
      await writeClient.storage.from(PASSPORT_STORAGE_BUCKET).remove(oldPaths)
    }
    // Delete old DB records
    const oldIds = existingDocs.map((d: any) => d.id)
    await (writeClient.from('documents') as any)
      .delete()
      .in('id', oldIds)
  }

  // 8. Insert document record (actual columns: name, file_url, file_size)
  const { error: insertError } = await (writeClient.from('documents') as any)
    .insert({
      dossier_id: input.dossierId,
      participant_id: input.targetParticipantId,
      type: 'passport_copy',
      name: `Passeport — ${input.targetParticipantName}`,
      file_url: storagePath,
      mime_type: file.type,
      file_size: file.size,
      is_client_visible: true,
    })

  if (insertError) {
    // Cleanup uploaded file
    await writeClient.storage.from(PASSPORT_STORAGE_BUCKET).remove([storagePath])
    console.error('Error inserting passport document:', JSON.stringify(insertError, null, 2))
    throw new Error(`Erreur lors de l'enregistrement du document: ${insertError.message}`)
  }

  // 9. Notify advisor
  await notifyAdvisorOfChange({
    dossierId: input.dossierId,
    participantName: input.requestingParticipantName,
    notificationType: 'document_uploaded',
    notificationTitle: 'Copie de passeport reçue',
    message: `${input.targetParticipantName} a envoyé sa copie de passeport.`,
    eventType: 'passport_copy_uploaded',
    eventPayload: {
      target_participant_id: input.targetParticipantId,
      target_participant_name: input.targetParticipantName,
      uploaded_by: input.requestingParticipantName,
    },
  })

  revalidatePath(`/client/voyages/${input.dossierId}`)
  revalidatePath(`/admin/dossiers/${input.dossierId}`)
}
