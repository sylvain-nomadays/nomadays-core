import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Fonction pour créer le client Supabase à la demande
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Webhook pour recevoir les emails entrants
 * Compatible avec plusieurs fournisseurs (Resend, SendGrid, Mailgun, etc.)
 *
 * Pour Resend: Configurer l'inbound webhook dans le dashboard Resend
 * URL: https://votre-domaine.com/api/webhooks/email/inbound
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier le secret webhook
    const webhookSecret = request.headers.get('x-webhook-secret')
    if (process.env.EMAIL_WEBHOOK_SECRET && webhookSecret !== process.env.EMAIL_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()

    // Parser le payload selon le format (Resend inbound)
    const emailData = parseInboundEmail(payload)

    if (!emailData) {
      console.error('Failed to parse inbound email:', payload)
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Extraire le threadId du destinataire (format: thread-{uuid}@reply.nomadays.com)
    const threadMatch = emailData.to.match(/thread-([a-f0-9-]+)@/i)
    const threadId = threadMatch?.[1]

    if (!threadId) {
      console.log('No thread ID found in recipient, storing as orphan:', emailData.to)
      // On pourrait créer un nouveau thread ou ignorer
      return NextResponse.json({ status: 'ignored', reason: 'no_thread_id' })
    }

    // Trouver le dossier associé au thread
    const { data: existingMessage } = await getSupabaseClient()
      .from('dossier_messages')
      .select('dossier_id')
      .eq('thread_id', threadId)
      .limit(1)
      .single()

    if (!existingMessage) {
      console.error('No dossier found for thread:', threadId)
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Créer le message entrant
    const { data: message, error } = await getSupabaseClient()
      .from('dossier_messages')
      .insert({
        dossier_id: existingMessage.dossier_id,
        thread_id: threadId,
        direction: 'inbound',
        sender_type: 'client',
        sender_id: null, // On pourrait chercher le participant par email
        sender_email: emailData.from,
        sender_name: emailData.fromName,
        recipient_email: emailData.to,
        recipient_name: null,
        subject: emailData.subject,
        body_text: emailData.text,
        body_html: emailData.html,
        attachments: emailData.attachments || [],
        status: 'delivered',
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving inbound email:', error)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // Créer une notification pour le conseiller
    const { data: dossier } = await getSupabaseClient()
      .from('dossiers')
      .select('advisor_id, title')
      .eq('id', existingMessage.dossier_id)
      .single()

    if (dossier?.advisor_id) {
      await getSupabaseClient().from('notifications').insert({
        user_id: dossier.advisor_id,
        type: 'message',
        title: 'Nouveau message client',
        message: `${emailData.fromName || emailData.from} a répondu sur le dossier "${dossier.title}"`,
        link: `/admin/dossiers/${existingMessage.dossier_id}?tab=messages`,
        metadata: {
          dossier_id: existingMessage.dossier_id,
          message_id: message.id,
        },
      })
    }

    // Mettre à jour last_activity_at du dossier
    await getSupabaseClient()
      .from('dossiers')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', existingMessage.dossier_id)

    console.log('Inbound email processed:', {
      messageId: message.id,
      dossierId: existingMessage.dossier_id,
      from: emailData.from,
    })

    return NextResponse.json({
      success: true,
      messageId: message.id,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface ParsedEmail {
  from: string
  fromName?: string
  to: string
  subject: string
  text: string
  html?: string
  attachments?: Array<{
    filename: string
    url: string
    size: number
    mime_type: string
  }>
}

/**
 * Parse le payload d'email entrant selon le format du fournisseur
 */
function parseInboundEmail(payload: any): ParsedEmail | null {
  // Format Resend inbound
  if (payload.type === 'email.received' || payload.data?.from) {
    const data = payload.data || payload
    return {
      from: extractEmail(data.from),
      fromName: extractName(data.from),
      to: extractEmail(data.to),
      subject: data.subject || '(Sans objet)',
      text: data.text || stripHtml(data.html) || '',
      html: data.html,
      attachments: data.attachments?.map((att: any) => ({
        filename: att.filename || att.name,
        url: att.url || att.content_id,
        size: att.size || 0,
        mime_type: att.content_type || att.type || 'application/octet-stream',
      })),
    }
  }

  // Format SendGrid inbound parse
  if (payload.from && payload.to && payload.text !== undefined) {
    return {
      from: extractEmail(payload.from),
      fromName: extractName(payload.from),
      to: extractEmail(payload.to),
      subject: payload.subject || '(Sans objet)',
      text: payload.text || '',
      html: payload.html,
    }
  }

  // Format générique
  if (payload.sender && payload.recipient) {
    return {
      from: payload.sender,
      to: payload.recipient,
      subject: payload.subject || '(Sans objet)',
      text: payload.body || payload.content || '',
      html: payload.html_body,
    }
  }

  return null
}

/**
 * Extrait l'adresse email d'une chaîne comme "John Doe <john@example.com>"
 */
function extractEmail(str: string): string {
  if (!str) return ''
  const match = str.match(/<([^>]+)>/)
  return match && match[1] ? match[1] : str.trim()
}

/**
 * Extrait le nom d'une chaîne comme "John Doe <john@example.com>"
 */
function extractName(str: string): string | undefined {
  if (!str) return undefined
  const match = str.match(/^([^<]+)</)
  return match && match[1] ? match[1].trim() : undefined
}

/**
 * Retire les balises HTML d'une chaîne
 */
function stripHtml(html: string | undefined): string {
  if (!html) return ''
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
