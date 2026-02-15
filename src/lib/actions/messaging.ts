'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/resend'
import { generateEmailHtml } from '@/lib/email/templates'

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

async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: userData } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role')
    .eq('id', user.id)
    .single()

  return userData
}

// ============================================================
// TYPES
// ============================================================

export interface Message {
  id: string
  dossier_id: string
  thread_id: string
  direction: 'inbound' | 'outbound'
  sender_type: 'client' | 'advisor' | 'support' | 'system'
  sender_id: string | null
  sender_email: string
  sender_name: string | null
  recipient_email: string
  recipient_name: string | null
  subject: string | null
  body_text: string
  body_html: string | null
  attachments: Array<{
    filename: string
    url: string
    size: number
    mime_type: string
  }>
  status: 'draft' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
  read_at: string | null
  template_id: string | null
  ai_assisted: boolean
  created_at: string
  // Multi-channel support
  channel: 'email' | 'whatsapp'
  whatsapp_message_sid?: string | null
  whatsapp_media_urls?: string[]
}

export interface EmailTemplate {
  id: string
  code: string
  name: string
  description: string | null
  category: string
  subject: string
  body_html: string
  body_text: string | null
  available_variables: string[]
  language: string
  is_default: boolean
  times_used: number
}

export interface AISuggestion {
  id: string
  dossier_id: string
  context_type: 'reply_to_client' | 'follow_up' | 'proactive' | 'question_answer'
  trigger_message_id: string | null
  suggested_subject: string | null
  suggested_body: string
  confidence_score: number | null
  status: 'pending' | 'accepted' | 'modified' | 'rejected' | 'expired'
  created_at: string
}

// ============================================================
// MESSAGES
// ============================================================

export async function getDossierMessages(dossierId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dossier_messages')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }

  return data as Message[]
}

export async function sendMessage(input: {
  dossierId: string
  recipientEmail: string
  recipientName?: string
  subject?: string
  bodyText: string
  bodyHtml?: string
  templateId?: string
  aiSuggestionId?: string
  attachments?: Array<{
    filename: string
    url: string
    size: number
    mime_type: string
  }>
}) {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    throw new Error('User not found')
  }

  // Auto-tag: Nomadays HQ staff → 'support', DMC staff → 'advisor'
  const senderType: 'advisor' | 'support' = ['admin_nomadays', 'support_nomadays'].includes(currentUser.role)
    ? 'support'
    : 'advisor'

  // Récupérer ou créer un thread
  const { data: threadData } = await supabase
    .rpc('get_active_thread', { p_dossier_id: input.dossierId })

  const threadId = threadData || crypto.randomUUID()

  // Créer le message
  const { data, error } = await supabase
    .from('dossier_messages')
    .insert({
      dossier_id: input.dossierId,
      thread_id: threadId,
      direction: 'outbound',
      sender_type: senderType,
      sender_id: currentUser.id,
      sender_email: currentUser.email,
      sender_name: `${currentUser.first_name} ${currentUser.last_name}`,
      recipient_email: input.recipientEmail,
      recipient_name: input.recipientName || null,
      subject: input.subject || null,
      body_text: input.bodyText,
      body_html: input.bodyHtml || null,
      attachments: input.attachments || [],
      template_id: input.templateId || null,
      ai_suggestion_id: input.aiSuggestionId || null,
      ai_assisted: !!input.aiSuggestionId,
      status: 'queued',
    })
    .select()
    .single()

  if (error) {
    console.error('Error sending message:', error)
    throw new Error('Failed to send message')
  }

  // Mettre à jour le template times_used
  if (input.templateId) {
    await supabase
      .from('email_templates')
      .update({ times_used: supabase.rpc('increment_template_usage') })
      .eq('id', input.templateId)
  }

  // Mettre à jour la suggestion IA si utilisée
  if (input.aiSuggestionId) {
    await supabase
      .from('email_ai_suggestions')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        final_body: input.bodyText,
      })
      .eq('id', input.aiSuggestionId)
  }

  // Mettre à jour last_activity_at du dossier
  await supabase
    .from('dossiers')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', input.dossierId)

  // ============================================================
  // ENVOI RÉEL DE L'EMAIL VIA RESEND
  // ============================================================
  const advisorName = `${currentUser.first_name} ${currentUser.last_name}`
  const emailHtml = input.bodyHtml || generateEmailHtml(input.bodyText, advisorName)

  const emailResult = await sendEmail({
    to: input.recipientEmail,
    toName: input.recipientName,
    subject: input.subject || 'Message de votre conseiller Nomadays',
    html: emailHtml,
    text: input.bodyText,
    threadId: threadId,
    messageId: data.id,
  })

  // Mettre à jour le statut du message selon le résultat
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
        error_message: emailResult.error,
      })
      .eq('id', data.id)

    console.error('Email send failed:', emailResult.error)
  }

  revalidatePath(`/admin/dossiers/${input.dossierId}`)
  return data
}

// ============================================================
// WHATSAPP MESSAGE
// ============================================================

export async function sendWhatsAppMessage(input: {
  dossierId: string
  recipientPhone: string    // Format E.164
  recipientName?: string
  bodyText: string
  mediaUrls?: string[]
  aiSuggestionId?: string
}) {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    throw new Error('User not found')
  }

  // Auto-tag: Nomadays HQ staff → 'support', DMC staff → 'advisor'
  const senderType: 'advisor' | 'support' = ['admin_nomadays', 'support_nomadays'].includes(currentUser.role)
    ? 'support'
    : 'advisor'

  // Récupérer le tenant_id du dossier
  const { data: dossier } = await supabase
    .from('dossiers')
    .select('tenant_id')
    .eq('id', input.dossierId)
    .single()

  if (!dossier) {
    throw new Error('Dossier not found')
  }

  // Récupérer la config WhatsApp du tenant
  const { data: waConfig } = await supabase
    .from('tenant_whatsapp_config')
    .select('whatsapp_number')
    .eq('tenant_id', dossier.tenant_id)
    .eq('is_active', true)
    .single()

  if (!waConfig) {
    throw new Error('WhatsApp non configuré pour ce tenant')
  }

  // Récupérer ou créer un thread
  const { data: threadData } = await supabase
    .rpc('get_active_thread', { p_dossier_id: input.dossierId })

  const threadId = threadData || crypto.randomUUID()

  // Créer le message
  const { data, error } = await supabase
    .from('dossier_messages')
    .insert({
      dossier_id: input.dossierId,
      thread_id: threadId,
      direction: 'outbound',
      sender_type: senderType,
      sender_id: currentUser.id,
      sender_email: currentUser.email,
      sender_name: `${currentUser.first_name} ${currentUser.last_name}`,
      recipient_email: input.recipientPhone,  // Téléphone dans le champ email
      recipient_name: input.recipientName || null,
      subject: null,  // WhatsApp n'a pas de sujet
      body_text: input.bodyText,
      body_html: null,
      attachments: [],
      channel: 'whatsapp',
      ai_suggestion_id: input.aiSuggestionId || null,
      ai_assisted: !!input.aiSuggestionId,
      status: 'queued',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating WhatsApp message:', error)
    throw new Error('Failed to create WhatsApp message')
  }

  // Mettre à jour la suggestion IA si utilisée
  if (input.aiSuggestionId) {
    await supabase
      .from('email_ai_suggestions')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        final_body: input.bodyText,
      })
      .eq('id', input.aiSuggestionId)
  }

  // Mettre à jour last_activity_at du dossier
  await supabase
    .from('dossiers')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', input.dossierId)

  // ============================================================
  // ENVOI RÉEL VIA TWILIO
  // ============================================================

  const { sendWhatsApp } = await import('@/lib/whatsapp/twilio')

  const result = await sendWhatsApp({
    to: input.recipientPhone,
    from: waConfig.whatsapp_number,
    body: input.bodyText,
    mediaUrls: input.mediaUrls,
    tenantId: dossier.tenant_id,
  })

  // Mettre à jour le statut selon le résultat
  if (result.success) {
    await supabase
      .from('dossier_messages')
      .update({
        status: 'sent',
        whatsapp_message_sid: result.messageSid,
        external_message_id: result.messageSid,
      })
      .eq('id', data.id)
  } else {
    await supabase
      .from('dossier_messages')
      .update({
        status: 'failed',
        error_message: result.error,
      })
      .eq('id', data.id)

    console.error('WhatsApp send failed:', result.error)
  }

  revalidatePath(`/admin/dossiers/${input.dossierId}`)
  return data
}

export async function markMessageAsRead(messageId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('dossier_messages')
    .update({
      status: 'read',
      read_at: new Date().toISOString(),
    })
    .eq('id', messageId)

  if (error) {
    console.error('Error marking message as read:', error)
  }
}

// ============================================================
// TEMPLATES
// ============================================================

export async function getEmailTemplates(category?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('email_templates')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('is_default', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching templates:', error)
    return []
  }

  return data as EmailTemplate[]
}

export async function getTemplateById(templateId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error) {
    console.error('Error fetching template:', error)
    return null
  }

  return data as EmailTemplate
}

export async function renderTemplate(
  templateId: string,
  variables: Record<string, string>
) {
  const template = await getTemplateById(templateId)
  if (!template) {
    throw new Error('Template not found')
  }

  let subject = template.subject
  let bodyHtml = template.body_html
  let bodyText = template.body_text || ''

  // Remplacer les variables
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{${key}}}`, 'g')
    subject = subject.replace(pattern, value)
    bodyHtml = bodyHtml.replace(pattern, value)
    bodyText = bodyText.replace(pattern, value)
  }

  return {
    subject,
    bodyHtml,
    bodyText,
  }
}

// ============================================================
// AI SUGGESTIONS
// ============================================================

export async function getAISuggestion(dossierId: string) {
  const supabase = await createClient()

  // Chercher une suggestion en attente et non expirée
  const { data, error } = await supabase
    .from('email_ai_suggestions')
    .select('*')
    .eq('dossier_id', dossierId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    // Pas de suggestion trouvée, c'est normal
    return null
  }

  return data as AISuggestion
}

export async function generateAISuggestion(input: {
  dossierId: string
  contextType: 'reply_to_client' | 'follow_up' | 'proactive' | 'question_answer'
  triggerMessageId?: string
  clientMessage?: string
}) {
  const supabase = await createClient()

  // Récupérer le contexte du dossier
  const { data: dossier } = await supabase
    .from('dossiers')
    .select(`
      *,
      participants:dossier_participants(
        is_lead,
        participant:participants!dossier_participants_participant_id_fkey(first_name, last_name, email)
      )
    `)
    .eq('id', input.dossierId)
    .single()

  if (!dossier) {
    throw new Error('Dossier not found')
  }

  // Récupérer l'historique des messages
  const { data: messages } = await supabase
    .from('dossier_messages')
    .select('*')
    .eq('dossier_id', input.dossierId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Récupérer la base de connaissances pertinente
  const { data: knowledge } = await supabase
    .from('email_knowledge_base')
    .select('*')
    .eq('is_active', true)
    .limit(20)

  // Construire le contexte pour l'IA
  const leadParticipant = (dossier.participants as any[])?.find((p: any) => p.is_lead)?.participant
  const clientName = leadParticipant
    ? `${leadParticipant.first_name} ${leadParticipant.last_name}`
    : 'Client'

  // TODO: Appeler l'API Claude pour générer la suggestion
  // Pour l'instant, on retourne une suggestion placeholder

  const suggestedBody = generatePlaceholderSuggestion(
    input.contextType,
    clientName,
    dossier.title || 'votre voyage',
    input.clientMessage
  )

  // Sauvegarder la suggestion
  const { data: suggestion, error } = await supabase
    .from('email_ai_suggestions')
    .insert({
      dossier_id: input.dossierId,
      context_type: input.contextType,
      trigger_message_id: input.triggerMessageId || null,
      suggested_subject: input.contextType === 'reply_to_client'
        ? `Re: Votre voyage ${dossier.title || ''}`
        : `${clientName}, votre voyage ${dossier.title || ''}`,
      suggested_body: suggestedBody,
      confidence_score: 0.85,
      model_used: 'placeholder', // TODO: 'claude-3-sonnet'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating AI suggestion:', error)
    throw new Error('Failed to create AI suggestion')
  }

  return suggestion as AISuggestion
}

function generatePlaceholderSuggestion(
  contextType: string,
  clientName: string,
  tripTitle: string,
  clientMessage?: string
): string {
  switch (contextType) {
    case 'reply_to_client':
      return `Bonjour ${clientName},

Merci pour votre message concernant ${tripTitle}.

[Votre réponse personnalisée ici]

Je reste à votre disposition pour toute question complémentaire.

Cordialement,`

    case 'follow_up':
      return `Bonjour ${clientName},

Je me permets de revenir vers vous concernant votre projet de voyage "${tripTitle}".

Avez-vous eu l'occasion de consulter notre proposition ? N'hésitez pas à me faire part de vos questions ou des ajustements que vous souhaiteriez apporter.

Je suis disponible pour en discuter par téléphone si vous le préférez.

Dans l'attente de vos nouvelles,
Cordialement,`

    case 'question_answer':
      return `Bonjour ${clientName},

En réponse à votre question concernant ${tripTitle} :

[Réponse basée sur la base de connaissances]

N'hésitez pas si vous avez d'autres questions.

Cordialement,`

    default:
      return `Bonjour ${clientName},

[Votre message ici]

Cordialement,`
  }
}

export async function rejectAISuggestion(suggestionId: string, reason?: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('email_ai_suggestions')
    .update({
      status: 'rejected',
      feedback_comment: reason || null,
    })
    .eq('id', suggestionId)

  if (error) {
    console.error('Error rejecting suggestion:', error)
  }
}

export async function provideSuggestionFeedback(
  suggestionId: string,
  rating: number,
  comment?: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('email_ai_suggestions')
    .update({
      feedback_rating: rating,
      feedback_comment: comment || null,
    })
    .eq('id', suggestionId)

  if (error) {
    console.error('Error providing feedback:', error)
  }
}

// ============================================================
// KNOWLEDGE BASE
// ============================================================

export async function searchKnowledgeBase(query: string, destination?: string) {
  const supabase = await createClient()

  // Recherche simple par mots-clés
  // TODO: Améliorer avec la recherche vectorielle
  let queryBuilder = supabase
    .from('email_knowledge_base')
    .select('*')
    .eq('is_active', true)
    .ilike('question_pattern', `%${query}%`)

  if (destination) {
    queryBuilder = queryBuilder.or(`applicable_destinations.cs.{${destination}},applicable_destinations.is.null`)
  }

  const { data, error } = await queryBuilder.limit(5)

  if (error) {
    console.error('Error searching knowledge base:', error)
    return []
  }

  return data
}

// ============================================================
// CLIENT MESSAGING (envoi depuis l'espace client)
// ============================================================

export async function sendClientMessage(input: {
  dossierId: string
  participantId: string
  participantEmail: string
  participantName: string
  advisorEmail: string
  advisorName: string
  subject?: string
  bodyText: string
}) {
  const supabase = await createClient()

  // Vérifier que le participant a accès au dossier
  const { data: dossierParticipant } = await supabase
    .from('dossier_participants')
    .select('id')
    .eq('dossier_id', input.dossierId)
    .eq('participant_id', input.participantId)
    .single()

  if (!dossierParticipant) {
    throw new Error('Access denied')
  }

  // Récupérer ou créer un thread
  const { data: threadData } = await supabase
    .rpc('get_active_thread', { p_dossier_id: input.dossierId })

  const threadId = threadData || crypto.randomUUID()

  // Créer le message (direction = inbound car vient du client)
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
      subject: input.subject || null,
      body_text: input.bodyText,
      body_html: null,
      attachments: [],
      status: 'queued',
    })
    .select()
    .single()

  if (error) {
    console.error('Error sending client message:', error)
    throw new Error('Failed to send message')
  }

  // Envoyer l'email réel au conseiller
  const emailHtml = generateEmailHtml(input.bodyText, input.participantName)

  const emailResult = await sendEmail({
    to: input.advisorEmail,
    toName: input.advisorName,
    subject: input.subject || `Message de ${input.participantName}`,
    html: emailHtml,
    text: input.bodyText,
    threadId: threadId,
    messageId: data.id,
  })

  // Mettre à jour le statut
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
        error_message: emailResult.error,
      })
      .eq('id', data.id)
  }

  // Créer une notification pour le conseiller
  const { data: dossier } = await supabase
    .from('dossiers')
    .select('advisor_id, title')
    .eq('id', input.dossierId)
    .single()

  if (dossier?.advisor_id) {
    await supabase.from('notifications').insert({
      user_id: dossier.advisor_id,
      type: 'message',
      title: 'Nouveau message client',
      message: `${input.participantName} vous a envoyé un message sur le dossier "${dossier.title}"`,
      link: `/admin/dossiers/${input.dossierId}?tab=messages`,
      metadata: {
        dossier_id: input.dossierId,
        message_id: data.id,
      },
    })
  }

  // Mettre à jour last_activity_at du dossier
  await supabase
    .from('dossiers')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', input.dossierId)

  revalidatePath(`/client/voyages/${input.dossierId}`)
  return data
}
