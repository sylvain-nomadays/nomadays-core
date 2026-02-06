'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { DossierStatus } from '@/lib/supabase/database.types'

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
// STATUS TRANSITION RULES
// ============================================================

/**
 * Règles de transition automatique des statuts :
 *
 * 1. lead → quote_sent : Quand une proposition est envoyée
 * 2. quote_sent → negotiation : Quand le client répond (demande modification)
 * 3. quote_sent → confirmed : Quand le client accepte la proposition
 * 4. confirmed → deposit_paid : Quand un acompte est reçu
 * 5. deposit_paid → fully_paid : Quand le solde est reçu
 * 6. fully_paid → in_trip : Automatique à la date de départ du voyage
 * 7. in_trip → completed : Automatique à la date de retour du voyage
 * 8. quote_sent → needs_followup : Après 5 jours sans réponse (via follow_up_date)
 *
 * Ces transitions sont déclenchées par les actions correspondantes.
 */

export interface StatusTransitionResult {
  previousStatus: DossierStatus
  newStatus: DossierStatus
  reason: string
  timestamp: string
}

// Log status change event
async function logStatusChange(
  supabase: ReturnType<typeof createServerClient>,
  dossierId: string,
  previousStatus: DossierStatus,
  newStatus: DossierStatus,
  reason: string,
  actorEmail?: string
) {
  await supabase.from('events').insert({
    dossier_id: dossierId,
    event_type: 'dossier_status_changed',
    actor_email: actorEmail,
    payload: {
      previous_status: previousStatus,
      new_status: newStatus,
      reason,
    }
  })
}

// ============================================================
// TRIGGERED TRANSITIONS
// ============================================================

/**
 * Appelé quand une proposition est envoyée au client
 */
export async function onProposalSent(dossierId: string, proposalId: string) {
  const supabase = await createClient()

  // Get current dossier
  const { data: dossier } = await supabase
    .from('dossiers')
    .select('status')
    .eq('id', dossierId)
    .single()

  if (!dossier) return

  const currentStatus = dossier.status as DossierStatus

  // Only transition if in lead or quote_in_progress
  if (['lead', 'quote_in_progress'].includes(currentStatus)) {
    // Calculate follow-up date (5 days from now)
    const followUpDate = new Date()
    followUpDate.setDate(followUpDate.getDate() + 5)

    await supabase
      .from('dossiers')
      .update({
        status: 'quote_sent',
        follow_up_date: followUpDate.toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', dossierId)

    await logStatusChange(supabase, dossierId, currentStatus, 'quote_sent', 'Proposition envoyée')

    // Log proposal sent event
    await supabase.from('events').insert({
      dossier_id: dossierId,
      event_type: 'proposal_sent',
      payload: { proposal_id: proposalId }
    })
  }

  revalidatePath(`/admin/dossiers/${dossierId}`)
  revalidatePath('/admin/dossiers')
}

/**
 * Appelé quand le client accepte une proposition
 */
export async function onProposalAccepted(dossierId: string, proposalId: string) {
  const supabase = await createClient()

  const { data: dossier } = await supabase
    .from('dossiers')
    .select('status')
    .eq('id', dossierId)
    .single()

  if (!dossier) return

  const currentStatus = dossier.status as DossierStatus

  // Transition to confirmed
  if (['quote_sent', 'negotiation'].includes(currentStatus)) {
    await supabase
      .from('dossiers')
      .update({
        status: 'confirmed',
        follow_up_date: null, // Clear follow-up
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', dossierId)

    await logStatusChange(supabase, dossierId, currentStatus, 'confirmed', 'Proposition acceptée par le client')

    await supabase.from('events').insert({
      dossier_id: dossierId,
      event_type: 'proposal_accepted',
      payload: { proposal_id: proposalId }
    })
  }

  revalidatePath(`/admin/dossiers/${dossierId}`)
  revalidatePath('/admin/dossiers')
}

/**
 * Appelé quand un paiement est reçu
 */
export async function onPaymentReceived(
  dossierId: string,
  amount: number,
  paymentType: 'deposit' | 'balance' | 'full'
) {
  const supabase = await createClient()

  const { data: dossier } = await supabase
    .from('dossiers')
    .select('status, total_sell')
    .eq('id', dossierId)
    .single()

  if (!dossier) return

  const currentStatus = dossier.status as DossierStatus
  let newStatus: DossierStatus = currentStatus
  let reason = ''

  if (paymentType === 'deposit' && currentStatus === 'confirmed') {
    newStatus = 'deposit_paid'
    reason = 'Acompte reçu'
  } else if (paymentType === 'balance' && currentStatus === 'deposit_paid') {
    newStatus = 'fully_paid'
    reason = 'Solde reçu - Paiement complet'
  } else if (paymentType === 'full' && ['confirmed', 'deposit_paid'].includes(currentStatus)) {
    newStatus = 'fully_paid'
    reason = 'Paiement complet reçu'
  }

  if (newStatus !== currentStatus) {
    await supabase
      .from('dossiers')
      .update({
        status: newStatus,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', dossierId)

    await logStatusChange(supabase, dossierId, currentStatus, newStatus, reason)

    await supabase.from('events').insert({
      dossier_id: dossierId,
      event_type: 'payment_received',
      payload: { amount, payment_type: paymentType }
    })
  }

  revalidatePath(`/admin/dossiers/${dossierId}`)
  revalidatePath('/admin/dossiers')
}

/**
 * Met à jour la date de relance manuellement
 */
export async function setFollowUpDate(dossierId: string, date: string | null) {
  const supabase = await createClient()

  await supabase
    .from('dossiers')
    .update({ follow_up_date: date })
    .eq('id', dossierId)

  revalidatePath(`/admin/dossiers/${dossierId}`)
}

// ============================================================
// SCHEDULED TRANSITIONS (to be called by CRON)
// ============================================================

/**
 * Vérifie et met à jour les statuts basés sur les dates de voyage
 * À appeler quotidiennement via un CRON job
 */
export async function checkTripDateTransitions() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Dossiers qui devraient passer en "in_trip" (date de départ = aujourd'hui)
  const { data: startingTrips } = await supabase
    .from('dossiers')
    .select('id, status')
    .eq('status', 'fully_paid')
    .lte('departure_date_from', today)

  if (startingTrips) {
    for (const dossier of startingTrips) {
      await supabase
        .from('dossiers')
        .update({ status: 'in_trip' })
        .eq('id', dossier.id)

      await logStatusChange(
        supabase,
        dossier.id,
        dossier.status as DossierStatus,
        'in_trip',
        'Début du voyage (automatique)'
      )
    }
  }

  // Dossiers qui devraient passer en "completed" (date de retour passée)
  const { data: endingTrips } = await supabase
    .from('dossiers')
    .select('id, status')
    .eq('status', 'in_trip')
    .lt('departure_date_to', today)

  if (endingTrips) {
    for (const dossier of endingTrips) {
      await supabase
        .from('dossiers')
        .update({ status: 'completed' })
        .eq('id', dossier.id)

      await logStatusChange(
        supabase,
        dossier.id,
        dossier.status as DossierStatus,
        'completed',
        'Fin du voyage (automatique)'
      )

      // TODO: Déclencher l'envoi du questionnaire de satisfaction
      await supabase.from('events').insert({
        dossier_id: dossier.id,
        event_type: 'email_sent',
        payload: { type: 'satisfaction_survey', auto_sent: true }
      })
    }
  }

  // Retourne le nombre de dossiers mis à jour
  return {
    startedTrips: startingTrips?.length || 0,
    completedTrips: endingTrips?.length || 0,
  }
}

/**
 * Récupère les dossiers qui nécessitent une relance
 * (follow_up_date dépassée ou dans les prochains jours)
 */
export async function getDossiersNeedingFollowUp() {
  const supabase = await createClient()
  const today = new Date().toISOString()

  // Dossiers avec follow_up_date dépassée ou aujourd'hui
  const { data, error } = await supabase
    .from('dossiers')
    .select(`
      *,
      advisor:users!dossiers_advisor_id_fkey(id, first_name, last_name, email),
      participants:dossier_participants(
        participant:participants(id, first_name, last_name),
        is_lead
      )
    `)
    .lte('follow_up_date', today)
    .in('status', ['quote_sent', 'negotiation'])
    .order('follow_up_date', { ascending: true })

  if (error) {
    console.error('Error fetching follow-up dossiers:', error)
    return []
  }

  return data || []
}

// ============================================================
// STATUS WORKFLOW HELPERS
// ============================================================

/**
 * Retourne les statuts vers lesquels on peut transitionner depuis le statut actuel
 */
export function getAllowedTransitions(currentStatus: DossierStatus): DossierStatus[] {
  const transitions: Record<DossierStatus, DossierStatus[]> = {
    ignored: ['lead'], // Réactiver un dossier ignoré
    lead: ['quote_in_progress', 'ignored', 'lost'],
    quote_in_progress: ['quote_sent', 'lead', 'lost'],
    quote_sent: ['negotiation', 'confirmed', 'lost', 'quote_in_progress'],
    negotiation: ['quote_sent', 'confirmed', 'lost'],
    confirmed: ['deposit_paid', 'cancelled'],
    deposit_paid: ['fully_paid', 'cancelled'],
    fully_paid: ['in_trip', 'cancelled'],
    in_trip: ['completed'],
    completed: ['archived'],
    lost: ['lead'], // Réactiver un dossier perdu
    cancelled: ['archived'],
    archived: [], // État final
  }

  return transitions[currentStatus] || []
}

/**
 * Vérifie si une transition est autorisée
 */
export function isTransitionAllowed(
  currentStatus: DossierStatus,
  targetStatus: DossierStatus
): boolean {
  const allowed = getAllowedTransitions(currentStatus)
  return allowed.includes(targetStatus)
}
