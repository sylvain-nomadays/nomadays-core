'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/resend'
import { generateEmailHtml } from '@/lib/email/templates'

// ─── Supabase client (same pattern as messaging.ts) ──────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReactionType = 'love' | 'modify'
export type PaceType = 'slower' | 'normal' | 'faster'

// ─── toggleDayReaction ───────────────────────────────────────────────────────

export async function toggleDayReaction(input: {
  tripDayId: number
  dossierId: string
  participantId: string
  reaction: ReactionType
}): Promise<{ reaction: ReactionType | null }> {
  const supabase = await createClient()

  // Check if a reaction already exists for this day + participant
  const { data: existing } = await supabase
    .from('trip_day_reactions')
    .select('id, reaction')
    .eq('trip_day_id', input.tripDayId)
    .eq('participant_id', input.participantId)
    .single()

  if (existing) {
    if (existing.reaction === input.reaction) {
      // Same reaction → toggle OFF (delete)
      await supabase
        .from('trip_day_reactions')
        .delete()
        .eq('id', existing.id)

      return { reaction: null }
    } else {
      // Different reaction → update
      await supabase
        .from('trip_day_reactions')
        .update({
          reaction: input.reaction,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      return { reaction: input.reaction }
    }
  }

  // No existing reaction → insert
  const { error } = await supabase
    .from('trip_day_reactions')
    .insert({
      trip_day_id: input.tripDayId,
      dossier_id: input.dossierId,
      participant_id: input.participantId,
      reaction: input.reaction,
    })

  if (error) {
    console.error('[toggleDayReaction] Error:', error)
    throw new Error('Failed to save reaction')
  }

  // If "modify" → create in-app notification for advisor (lightweight, no email)
  if (input.reaction === 'modify') {
    try {
      const { data: dossier } = await supabase
        .from('dossiers')
        .select('advisor_id, title')
        .eq('id', input.dossierId)
        .single()

      if (dossier?.advisor_id) {
        await supabase.from('notifications').insert({
          user_id: dossier.advisor_id,
          type: 'message',
          title: 'Feedback programme',
          message: `Un voyageur souhaite modifier un jour du programme "${dossier.title}"`,
          link: `/admin/dossiers/${input.dossierId}?tab=messages`,
          metadata: {
            dossier_id: input.dossierId,
            trip_day_id: input.tripDayId,
            feedback_type: 'reaction_modify',
          },
        })
      }
    } catch {
      // Don't fail the reaction if notification fails
    }
  }

  return { reaction: input.reaction }
}

// ─── submitDayComment ────────────────────────────────────────────────────────
// Sends a feedback comment as a message in the Salon de Thé thread.
// Follows the exact pattern of sendClientMessage in messaging.ts.

export async function submitDayComment(input: {
  dossierId: string
  tripDayId: number
  dayNumber: number
  dayTitle: string | null
  participantId: string
  participantEmail: string
  participantName: string
  advisorEmail: string
  advisorName: string
  bodyText: string
}): Promise<void> {
  const supabase = await createClient()

  // Verify participant access
  const { data: dossierParticipant } = await supabase
    .from('dossier_participants')
    .select('id')
    .eq('dossier_id', input.dossierId)
    .eq('participant_id', input.participantId)
    .single()

  if (!dossierParticipant) {
    throw new Error('Access denied')
  }

  // Get or create thread
  const { data: threadData } = await supabase
    .rpc('get_active_thread', { p_dossier_id: input.dossierId })

  const threadId = threadData || crypto.randomUUID()

  // Build subject line
  const dayLabel = input.dayTitle
    ? `Jour ${input.dayNumber} — ${input.dayTitle}`
    : `Jour ${input.dayNumber}`
  const subject = `💬 Feedback ${dayLabel}`

  // Insert message into dossier_messages (direction = inbound, sender_type = client)
  const { data, error } = await supabase
    .from('dossier_messages')
    .insert({
      dossier_id: input.dossierId,
      thread_id: threadId,
      direction: 'inbound',
      sender_type: 'client',
      sender_id: input.participantId,
      sender_email: input.participantEmail,
      sender_name: input.participantName,
      recipient_email: input.advisorEmail,
      recipient_name: input.advisorName,
      subject,
      body_text: input.bodyText,
      body_html: null,
      attachments: [],
      status: 'queued',
      metadata: {
        type: 'day_feedback',
        trip_day_id: input.tripDayId,
        day_number: input.dayNumber,
      },
    })
    .select()
    .single()

  if (error) {
    console.error('[submitDayComment] Error inserting message:', error)
    throw new Error('Failed to send comment')
  }

  // Send actual email to advisor
  const emailHtml = generateEmailHtml(input.bodyText, input.participantName)

  const emailResult = await sendEmail({
    to: input.advisorEmail,
    toName: input.advisorName,
    subject,
    html: emailHtml,
    text: input.bodyText,
    threadId,
    messageId: data.id,
  })

  // Update message status
  if (emailResult.success) {
    await supabase
      .from('dossier_messages')
      .update({
        status: 'sent',
        external_message_id: emailResult.messageId,
      })
      .eq('id', data.id)
  } else {
    await supabase
      .from('dossier_messages')
      .update({
        status: 'failed',
      })
      .eq('id', data.id)
  }

  // Create notification for advisor
  const { data: dossier } = await supabase
    .from('dossiers')
    .select('advisor_id, title')
    .eq('id', input.dossierId)
    .single()

  if (dossier?.advisor_id) {
    await supabase.from('notifications').insert({
      user_id: dossier.advisor_id,
      type: 'message',
      title: 'Feedback programme',
      message: `${input.participantName} a commenté le ${dayLabel} du programme "${dossier.title}"`,
      link: `/admin/dossiers/${input.dossierId}?tab=messages`,
      metadata: {
        dossier_id: input.dossierId,
        trip_day_id: input.tripDayId,
        day_number: input.dayNumber,
        message_id: data.id,
        feedback_type: 'comment',
      },
    })
  }

  // Update dossier last_activity_at
  await supabase
    .from('dossiers')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', input.dossierId)

  revalidatePath(`/client/voyages/${input.dossierId}`)
}

// ─── setDayPace ──────────────────────────────────────────────────────────────

export async function setDayPace(input: {
  tripDayId: number
  dossierId: string
  participantId: string
  pace: PaceType
}): Promise<void> {
  const supabase = await createClient()

  // Upsert: use unique constraint (trip_day_id, participant_id)
  const { data: existing } = await supabase
    .from('trip_day_pace')
    .select('id')
    .eq('trip_day_id', input.tripDayId)
    .eq('participant_id', input.participantId)
    .single()

  if (existing) {
    await supabase
      .from('trip_day_pace')
      .update({
        pace: input.pace,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('trip_day_pace')
      .insert({
        trip_day_id: input.tripDayId,
        dossier_id: input.dossierId,
        participant_id: input.participantId,
        pace: input.pace,
      })
  }
}

// ─── getDayReactions (bulk fetch) ────────────────────────────────────────────

export async function getDayReactions(
  tripDayIds: number[],
  participantId: string,
): Promise<Record<number, ReactionType>> {
  if (tripDayIds.length === 0) return {}

  const supabase = await createClient()

  const { data } = await supabase
    .from('trip_day_reactions')
    .select('trip_day_id, reaction')
    .in('trip_day_id', tripDayIds)
    .eq('participant_id', participantId)

  const map: Record<number, ReactionType> = {}
  for (const row of data || []) {
    map[row.trip_day_id] = row.reaction as ReactionType
  }
  return map
}

// ─── getDayPaces (bulk fetch) ────────────────────────────────────────────────

export async function getDayPaces(
  tripDayIds: number[],
  participantId: string,
): Promise<Record<number, PaceType>> {
  if (tripDayIds.length === 0) return {}

  const supabase = await createClient()

  const { data } = await supabase
    .from('trip_day_pace')
    .select('trip_day_id, pace')
    .in('trip_day_id', tripDayIds)
    .eq('participant_id', participantId)

  const map: Record<number, PaceType> = {}
  for (const row of data || []) {
    map[row.trip_day_id] = row.pace as PaceType
  }
  return map
}
